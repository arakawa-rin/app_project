from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from dotenv import load_dotenv
from sqlalchemy import func,text,Numeric
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation,ROUND_DOWN
import os,random, string
from models import db
from models.models import Users, Events, Event_Participants, Expense_Categories, Expenses, Allocations, Settlements


load_dotenv()

app = Flask(__name__)

def normalize_database_url(raw_uri):
    if not raw_uri:
        raise RuntimeError("DATABASE_URL or URI is not set.")
    if raw_uri.startswith("postgres://"):
        return raw_uri.replace("postgres://", "postgresql://", 1)
    return raw_uri


uri = normalize_database_url(os.getenv("URI") or os.getenv("DATABASE_URL"))
app.config["SQLALCHEMY_DATABASE_URI"] = uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


db.init_app(app)

app.secret_key = os.getenv("app_password") or os.getenv("SECRET_KEY") or "dev-secret-key"

app.permanent_session_lifetime = timedelta(days=365)


from app.api_route import api

app.register_blueprint(api)





#トップページ
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        event_name = request.form.get('event_name')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        display_name = request.form.get('display_name')


        # 入力チェック
        if not event_name or not start_date or not end_date or not display_name:
            return render_template('index.html', error="入力してください")

        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date   = datetime.strptime(end_date,   '%Y-%m-%d').date()
        except ValueError:
            return render_template('index.html', error="日付が不正です")

        # 日付チェック
        if start_date > end_date:
            return render_template('index.html', error="日付が不正です")



        #ゲストユーザーを作成してuser_idを自動採番
        user1 = session.get("user_id")
        if user1 is None:
            user1 = guest_create()
        
        #イベントテーブルにデータ挿入
        events = Events(event_name=event_name, start_date=start_date, end_date=end_date, created_by=user1)
        
        db.session.add(events)
        db.session.flush()

        #イベント参加者テーブルにデータ挿入
        event_participants = Event_Participants(event_id=events.event_id, user_id=user1, display_name=display_name, status='joined')
        db.session.add(event_participants)

        member_names = request.form.getlist('member_names[]')
        for name in member_names:
            name = name.strip()
            if name:
                member_participant = Event_Participants(event_id=events.event_id, user_id=None, display_name=name, status='joined')
                db.session.add(member_participant)

        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Events.query.filter_by(invite_code=code).first():
                events.invite_code = code
                break

        db.session.commit()
        
        return redirect(url_for('event_list'))

    # GETリクエスト時
    else:
        return render_template('index.html')

#イベント一覧ページ   
@app.route('/event_list',methods=['GET', 'POST'])
def event_list():
    if request.method == "GET":
        user_id = session.get("user_id")
        if user_id is None:
           return redirect(url_for("index"))
    
        created_events = (db.session.query(Events).filter(Events.created_by == user_id, Events.deleted_at.is_(None)).order_by(Events.created_at.desc()).all())
        joined_events = (db.session.query(Events).join(Event_Participants, Events.event_id == Event_Participants.event_id)
                        .filter(Event_Participants.user_id == user_id, Events.created_by != user_id, Events.deleted_at.is_(None), Event_Participants.deleted_at.is_(None))
                        .order_by(Events.created_at.desc()).all())

        return render_template("event_list.html", created_events=created_events, joined_events=joined_events)
    
    
    else:
        return render_template('index.html')

#イベント詳細ページ
@app.route('/events/<int:event_id>',methods=['GET'])
def details(event_id):
    if not check_participant(event_id):
        return redirect(url_for('event_list'))
    if request.method =="GET":
       events = Events.query.get_or_404(event_id)
       if events.deleted_at is not None:
           return redirect(url_for('event_list'))
       participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()
       
       # 支出一覧を取得（カテゴリ名と立替者名も一緒に）
       expenses_raw = (db.session.query(
           Expenses.expense_id,
           Expenses.expense_amount,
           Expenses.expense_at,
           Expense_Categories.category_name,
           Event_Participants.display_name.label('payer_name')
       )
       .outerjoin(Expense_Categories, Expenses.category_id == Expense_Categories.category_id)
       .join(Event_Participants, Expenses.payer_ep_id == Event_Participants.event_participant_id)
       .filter(Expenses.event_id == event_id, Expenses.deleted_at.is_(None))
       .order_by(Expenses.expense_at.desc())
       .all())

       return render_template('event_details.html', events=events, participants=participants, expenses=expenses_raw)

@app.route('/events/<int:event_id>/edit',methods=['GET','POST'])
def edit(event_id):
    events = Events.query.get_or_404(event_id)
    if not check_creater(events):
        return redirect(url_for('details', event_id=event_id))
    if request.method == "GET":
        return render_template('event_edit.html',events=events)

    else:
        event_name = request.form.get('event_name')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')

        # 入力チェック
        if not event_name or not start_date or not end_date:
            return render_template('event_edit.html', error="入力してください",events=events)
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date   = datetime.strptime(end_date,   '%Y-%m-%d').date()
        except ValueError:
            return render_template('event_edit.html', error="日付が不正です", events=events)

        # 日付チェック
        if start_date > end_date:
            return render_template('event_edit.html', error="日付が不正です",events=events)
        

        events.event_name = event_name
        events.start_date = start_date
        events.end_date = end_date

        db.session.commit()

        return redirect(url_for('details', event_id=event_id))
    
@app.route('/events/<int:event_id>/delete', methods=['POST'])
def delete_event(event_id):
    event = Events.query.get_or_404(event_id)
    if not check_creater(event):
        return redirect(url_for('details', event_id=event_id))
    event.deleted_at = datetime.now()
    db.session.commit()
    return redirect(url_for('event_list'))

        
    

@app.route('/events/<int:event_id>/add_expense',methods=['GET', 'POST'])
def add_expense(event_id):
    if not check_participant(event_id):
        return redirect(url_for('event_list'))
    if request.method =="POST":
        event = Events.query.get_or_404(event_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).all()

        category_name = request.form.get('category_name')
        expense_amount = request.form.get('expense_amount')
        payer_ep_id = request.form.get('payer_ep_id')
        participants_ids = request.form.getlist('participants[]')
        expense_at = request.form.get('expense_at')
        description = request.form.get('description')
        split_method = request.form.get('split_method')


        if not category_name or not expense_amount or not payer_ep_id or not participants_ids or not expense_at:
            return render_template('add_expense.html', error="入力してください", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)
        
        category_name = category_name.strip()

        try:
            expense_at = datetime.strptime(expense_at, '%Y-%m-%d').date()
        except ValueError:
            return render_template('add_expense.html', error="日付が不正です", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)

        try:
            expense_amount = Decimal(expense_amount)
        except InvalidOperation:
            return render_template('add_expense.html', error="金額が不正です", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)
        
        if expense_amount <= 0:
            return render_template('add_expense.html', error="金額が不正です", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)

        if event.start_date > expense_at or expense_at > event.end_date:
            return render_template('add_expense.html', error="日付が不正です", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)
        
        if not Event_Participants.query.filter_by(event_id=event_id,event_participant_id=payer_ep_id).first():
            return render_template('add_expense.html', error="立替人がイベント参加者ではありません", event_id=event_id,participants=participants,event=event,participant_ids=participants_ids)
        
        #カテゴリ登録・取得ブロック
        category = Expense_Categories.query.filter_by(event_id=event_id, category_name=category_name).one_or_none()
        if category is None:
            category = Expense_Categories(category_name=category_name,event_id=event_id)
            db.session.add(category)
            db.session.flush()

        expenses = Expenses(event_id=event_id,expense_amount=expense_amount,payer_ep_id=payer_ep_id,expense_at=expense_at, description=description, category_id=category.category_id)
        db.session.add(expenses)
        db.session.flush()

        #割り勘形式別計算ロジック
        alloc_error = create_allocations(expenses.expense_id, event_id, expense_amount, split_method, participants_ids, request.form)
        if alloc_error:
            return render_template('add_expense.html', error=alloc_error, event_id=event_id, participants=participants, event=event)

        db.session.commit()

        return redirect(url_for('details',event_id=event_id))

    else: 
        event = Events.query.get_or_404(event_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).all()
        return render_template('add_expense.html',event=event,participants=participants)
    

@app.route('/events/<int:event_id>/expenses/<int:expense_id>/edit',methods=['GET','POST'])
def expense_edit(event_id, expense_id):
    if not check_participant(event_id):
        return redirect(url_for('event_list'))
    if request.method == "GET":
        events = Events.query.get_or_404(event_id)
        expenses = Expenses.query.get_or_404(expense_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()
        categories = Expense_Categories.query.get(expenses.category_id)
        allocations = Allocations.query.filter_by(expense_id=expenses.expense_id).filter(Allocations.deleted_at.is_(None)).all()
        return render_template('expense_edit.html',events=events,expenses=expenses,participants=participants,categories=categories,allocations=allocations)
    
    else:
        event = Events.query.get_or_404(event_id)
        expenses = Expenses.query.get_or_404(expense_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()
        categories = Expense_Categories.query.get(expenses.category_id)
        allocations = Allocations.query.filter_by(expense_id=expense_id).filter(Allocations.deleted_at.is_(None)).all()

        category_name = request.form.get('category_name')
        expense_amount = request.form.get('expense_amount')
        payer_ep_id = request.form.get('payer_ep_id')
        participants_ids = request.form.getlist('participants[]')
        expense_at = request.form.get('expense_at')
        description = request.form.get('description')
        split_method = request.form.get('split_method')

        err_ctx = dict(event=event, events=event, expenses=expenses, participants=participants,
                       categories=categories, allocations=allocations, participant_ids=participants_ids)

        if not category_name or not expense_amount or not payer_ep_id or not participants_ids or not expense_at:
            return render_template('expense_edit.html', error="入力してください", **err_ctx)

        if split_method not in ["EQUAL","UNITS"]:
            return render_template('expense_edit.html', error="割り勘方式が不正です", **err_ctx)

        try:
            expense_at = datetime.strptime(expense_at, '%Y-%m-%d').date()
        except ValueError:
            return render_template('expense_edit.html', error="日付が不正です", **err_ctx)

        try:
            expense_amount = Decimal(expense_amount)
        except InvalidOperation:
            return render_template('expense_edit.html', error="金額が不正です", **err_ctx)

        if expense_amount <= 0:
            return render_template('expense_edit.html', error="金額が不正です", **err_ctx)

        if event.start_date > expense_at or expense_at > event.end_date:
            return render_template('expense_edit.html', error="日付が不正です", **err_ctx)

        if not Event_Participants.query.filter_by(event_id=event_id,event_participant_id=payer_ep_id).first():
            return render_template('expense_edit.html', error="立替人がイベント参加者ではありません", **err_ctx)

        category = Expense_Categories.query.filter_by(event_id=event_id, category_name=category_name).one_or_none()
        if category is None:
            category = Expense_Categories(category_name=category_name,event_id=event_id)
            db.session.add(category)
            db.session.flush()

        expenses.expense_amount = expense_amount
        expenses.payer_ep_id = payer_ep_id
        expenses.expense_at = expense_at
        expenses.description = description
        expenses.category_id = category.category_id

        #既存のAllocationsを物理削除
        Allocations.query.filter_by(expense_id=expense_id).delete()

        #割り勘形式別計算ロジック
        alloc_error = create_allocations(expense_id, event_id, expense_amount, split_method, participants_ids, request.form)
        if alloc_error:
            db.session.rollback()
            return render_template('expense_edit.html', error=alloc_error, **err_ctx)

        db.session.commit()

        return redirect(url_for('details', event_id=event_id))

@app.route('/events/<int:event_id>/expenses/<int:expense_id>/delete', methods=['POST'])
def delete_expense(event_id, expense_id):
    if not check_participant(event_id):
        return redirect(url_for('event_list'))
    expense = Expenses.query.get_or_404(expense_id)
    expense.deleted_at = datetime.now()

    Allocations.query.filter_by(expense_id=expense_id).delete()

    db.session.commit()
    return redirect(url_for('details', event_id=event_id))



        
@app.route('/events/<int:event_id>/settlements',methods=['GET'])
def settlements(event_id):
    if not check_participant(event_id):
        return redirect(url_for('event_list'))
    if request.method == "GET":
        event = Events.query.get_or_404(event_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()

        allocations_row = (db.session.query(
            Allocations.event_participant_id.label("ep_id"),
            func.coalesce(func.sum(Allocations.allocation_amount), 0).label("total_allocations")
        )
        .join(Expenses, Allocations.expense_id == Expenses.expense_id)
        .filter(Expenses.event_id == event_id,Expenses.deleted_at.is_(None), Allocations.deleted_at.is_(None))
        .group_by(Allocations.event_participant_id)
        .all()
        )

        expenses_row = (db.session.query(
            Expenses.payer_ep_id.label("ep_id"),
            func.coalesce(func.sum(Expenses.expense_amount), 0).label("total_paid")
        ).filter(Expenses.event_id == event_id, Expenses.deleted_at.is_(None))
        .group_by(Expenses.payer_ep_id)
        .all()
        )

        allocations_dict = {row.ep_id: row.total_allocations for row in allocations_row}
        expenses_dict = {row.ep_id: row.total_paid for row in expenses_row}

        settlement_summary = []
        for p in participants:
            ep_id = p.event_participant_id
            total_alloc = allocations_dict.get(ep_id, Decimal('0'))
            total_paid = expenses_dict.get(ep_id, Decimal('0'))
            net = total_paid - total_alloc
            settlement_summary.append({
            "event_participant_id": ep_id,
            "display_name": p.display_name,
            "total_allocations": total_alloc,
            "total_paid": total_paid,
            "net": net,
            })

        balances = []
        for item in settlement_summary:
            if item["net"] != Decimal('0'):
                balances.append({
                    "ep_id": item["event_participant_id"],
                    "display_name": item["display_name"],
                    "net": item["net"]
                })
        
        total_balance = sum((b["net"] for b in balances), Decimal('0'))
        if total_balance != Decimal('0'):
            return render_template('settlements.html', event=event, error="内部エラー: 貸借の合計が0になっていません")


        creditors = []
        debtors = []
        for b in balances:
            if b["net"] > Decimal('0'):
                creditors.append(b)
            else:
                debtors.append(b)
        
        creditors.sort(key=lambda x: x["net"], reverse=True)
        debtors.sort(key=lambda x: x["net"])

        settlements = []

        original_credit_sum = sum((b["net"] for b in balances if b["net"] > Decimal('0')), Decimal('0'))
        
        while creditors and debtors:
            creditor = creditors[0]
            debtor = debtors[0]

            settlement_amount = min(creditor["net"], -debtor["net"])
            settlements.append({
                "payee_display_name": creditor["display_name"],
                "payer_display_name": debtor["display_name"],
                "amount": settlement_amount
            })

            creditor["net"] -= settlement_amount
            debtor["net"] += settlement_amount

            if creditor["net"] == Decimal('0'):
                creditors.pop(0)
            if debtor["net"] == Decimal('0'):
                debtors.pop(0)
        
        if creditors or debtors:
            return render_template('settlements.html', event=event, error="内部エラー: 貸借の計算に未処理があります")
        
        total_settlement = sum((s["amount"] for s in settlements), Decimal('0'))
        if total_settlement != original_credit_sum:
            return render_template('settlements.html', event=event, error="内部エラー: 精算金額の合計が債権の合計と一致しません")
        
        return render_template('settlements.html', event=event, settlements=settlements,settlement_summary=settlement_summary,participants=participants)
    
@app.route('/join_event', methods=['GET','POST'])
def join_event():
    if request.method == "GET":
        return render_template('join.html')
    
    invite_code = request.form.get('invite_code')
    if not invite_code or not invite_code.strip():
        return render_template('join.html', error="招待コードを入力してください")

    event = Events.query.filter_by(invite_code=invite_code.strip()).first()
    if event is None:
        return render_template('join.html', error="招待コードが無効です")

    unlinked = Event_Participants.query.filter_by(event_id=event.event_id, user_id=None).all()

    return render_template('join_select.html', event=event, unlinked=unlinked)



@app.route('/join_event/confirm/<int:event_id>', methods=['POST'])
def join_event_confirm(event_id):
    selected_ep_id = request.form.get('selected_ep_id')

    user_id = session.get("user_id")
    if user_id is None:
        user_id = guest_create()

    if selected_ep_id == "new":
        display_name = request.form.get('display_name')
        if not display_name or not display_name.strip():
            return render_template('join_select.html', event=Events.query.get(event_id), unlinked=Event_Participants.query.filter_by(event_id=event_id, user_id=None).all(), error="表示名を入力してください")
        new_participant = Event_Participants(event_id=event_id, user_id=user_id, display_name=display_name, status='joined')
        db.session.add(new_participant)

    else:
        participant = Event_Participants.query.get(selected_ep_id)
        if participant is None:
            return render_template('join_select.html', event=Events.query.get(event_id), unlinked=Event_Participants.query.filter_by(event_id=event_id, user_id=None).all(), error="参加者の選択が不正です")
        participant.user_id = user_id
        participant.status = 'joined'
        participant.joined_at = datetime.now()

    db.session.commit()
    return redirect(url_for('details', event_id=event_id))        
    
        
        
    




        



#ゲスト作成
def guest_create():
    session.permanent = True
    guest_user = Users(user_name="guest_user")
    db.session.add(guest_user)
    db.session.flush()
    user1 = guest_user.user_id
    session["user_id"] = user1
    return user1

#アクセスチェック(参加者)
def check_participant(event_id):
    user_id = session.get("user_id")
    if not user_id:
        return None
    return Event_Participants.query.filter_by(
        event_id=event_id, user_id=user_id
    ).filter(Event_Participants.deleted_at.is_(None)).first()

#アクセスチェック(作成者)
def check_creater(event):
    user_id = session.get("user_id")
    if not user_id:
        return False
    return event.created_by == user_id

#割り勘計算
def create_allocations(expense_id, event_id, expense_amount, split_method, participants_ids, form):

    if split_method == "EQUAL":
        if not participants_ids:
            return "負担者を選択してください"

        try:
            participant_ids = [int(x) for x in participants_ids]
        except ValueError:
            return "負担者の指定が不正です"

        if not participant_ids:
            return "負担者を選択してください"

        raws = Event_Participants.query.with_entities(Event_Participants.event_participant_id).filter_by(event_id=event_id).all()
        ep_ids = {r.event_participant_id for r in raws}

        invalid_ids = set(participant_ids) - ep_ids
        if invalid_ids:
            return "負担者の指定が不正です"

        num_participants = len(participant_ids)
        base = (expense_amount / num_participants).quantize(Decimal('0.01'), rounding=ROUND_DOWN)

        for i, ep_id in enumerate(participant_ids):
            if i == num_participants - 1:
                allocation_amount = expense_amount - base * (num_participants - 1)
            else:
                allocation_amount = base

            allocation = Allocations(expense_id=expense_id, event_participant_id=ep_id, weight=1, allocation_amount=allocation_amount)
            db.session.add(allocation)

    elif split_method == "UNITS":
        unit_price = form.get('unit_price')

        try:
            unit_price = unit_price.strip()
        except AttributeError:
            return "1口単価が不正です"

        try:
            unit_price_decimal = Decimal(unit_price)
        except InvalidOperation:
            return "1口単価が不正です"

        if unit_price_decimal <= 0:
            return "1口単価が不正です"

        if not participants_ids:
            return "負担者を選択してください"

        try:
            participant_ids = [int(x) for x in participants_ids]
        except ValueError:
            return "負担者の指定が不正です"

        units_dict = {}

        for ep_id in participant_ids:
            key = f"units_{ep_id}"
            units_raw = str(form.get(key, 0)).strip()
            try:
                units = int(units_raw)
            except ValueError:
                return "負担者の口数が不正です"

            units_dict[ep_id] = units

        if sum(units_dict.values()) <= 0:
            return "口数が不正です"

        rows = Event_Participants.query.with_entities(Event_Participants.event_participant_id).filter_by(event_id=event_id).all()
        ep_ids = {r.event_participant_id for r in rows}

        invalid_ids = set(participant_ids) - ep_ids
        if invalid_ids:
            return "負担者の指定が不正です"

        total_amount = unit_price_decimal * sum(units_dict.values())
        if total_amount != expense_amount:
            return "合計金額と口数×１口単価の整合性が不正です"

        for ep_id, units in units_dict.items():
            allocation_amount = (unit_price_decimal * units).quantize(Decimal('0.01'))
            allocation = Allocations(
                expense_id=expense_id,
                event_participant_id=ep_id,
                weight=units,
                allocation_amount=allocation_amount
            )
            db.session.add(allocation)

    else:
        return "割り勘方式が不正です"

    return None


