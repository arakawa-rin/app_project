from flask import Blueprint, request, jsonify, session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_DOWN
import random, string
from models import db
from models.models import Users, Events, Event_Participants, Expense_Categories, Expenses, Allocations, Settlements

api = Blueprint('api', __name__)




#APIイベント一覧・作成ルート
@api.route('/api/events', methods=['GET', 'POST'])
def api_events():
    if request.method == 'POST':
        data = request.get_json()
        event_name = data.get('event_name')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        display_name = data.get('display_name')

        # 入力チェック
        if not event_name or not start_date or not end_date or not display_name:
            return jsonify({"success": False, "error": "入力してください"}), 400
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date   = datetime.strptime(end_date,   '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        # 日付チェック
        if start_date > end_date:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

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

        member_names = data.get('member_names', [])
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

        return jsonify({"success": True, "event_id": events.event_id})

    else:  # GET
        user_id = session.get("user_id")
        if user_id is None:
            return jsonify({"success": False, "error": "Unauthorized"}), 401

        created_events = (db.session.query(Events).filter(Events.created_by == user_id, Events.deleted_at.is_(None)).order_by(Events.created_at.desc()).all())
        joined_events = (db.session.query(Events).join(Event_Participants, Events.event_id == Event_Participants.event_id)
                        .filter(Event_Participants.user_id == user_id, Events.created_by != user_id, Events.deleted_at.is_(None), Event_Participants.deleted_at.is_(None))
                        .order_by(Events.created_at.desc()).all())

        return jsonify({"success": True, "created_events": [e.to_dict() for e in created_events], "joined_events": [e.to_dict() for e in joined_events]})
#APIイベント詳細・編集・削除ルート
@api.route('/api/events/<int:event_id>', methods=['GET', 'PUT', 'DELETE'])
def api_event_detail(event_id):
    events = Events.query.get_or_404(event_id)

    if request.method == 'GET':
        if not check_participant(event_id):
            return jsonify({"success": False, "error": "Unauthorized"}), 401
        if events.deleted_at is not None:
            return jsonify({"success": False, "error": "Event not found"}), 404
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()

        # 支出一覧を取得（カテゴリ名と立替者名も一緒に）
        expenses_raw = (db.session.query(
            Expenses.expense_id,
            Expenses.expense_amount,
            Expenses.expense_at,
            Expense_Categories.category_name,
            Event_Participants.display_name.label('payer_name'))
        .outerjoin(Expense_Categories, Expenses.category_id == Expense_Categories.category_id)
        .join(Event_Participants, Expenses.payer_ep_id == Event_Participants.event_participant_id)
        .filter(Expenses.event_id == event_id, Expenses.deleted_at.is_(None))
        .order_by(Expenses.expense_at.desc())
        .all())

        expenses_raw_dict = [{
            "expense_id": e.expense_id,
            "expense_amount": str(e.expense_amount),
            "expense_at": str(e.expense_at),
            "category_name": e.category_name,
            "payer_name": e.payer_name
        } for e in expenses_raw]

        return jsonify({"success": True, "event": events.to_dict(), "participants": [p.to_dict() for p in participants], "expenses": expenses_raw_dict})

    elif request.method == 'PUT':
        if not check_creater(events):
            return jsonify({"success": False, "error": "Unauthorized"}), 401
        data = request.get_json()
        event_name = data.get('event_name')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not event_name or not start_date or not end_date:
            return jsonify({"success": False, "error": "入力してください"}), 400
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date   = datetime.strptime(end_date,   '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"success": False, "error": "不正な値です"}), 400
        if start_date > end_date:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        events.event_name = event_name
        events.start_date = start_date
        events.end_date = end_date
        db.session.commit()
        return jsonify({"success": True, "event": events.to_dict()})

    else:  # DELETE
        if not check_creater(events):
            return jsonify({"success": False, "error": "Unauthorized"}), 401
        events.deleted_at = datetime.now()
        db.session.commit()
        return jsonify({"success": True})

#API支出追加ルート
@api.route('/api/events/<int:event_id>/expenses',methods=['GET', 'POST'])
def api_add_expense(event_id):
    if not check_participant(event_id):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    if request.method =="POST":
        event = Events.query.get_or_404(event_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).all()

        data = request.get_json()
        category_name = data.get('category_name')
        expense_amount = data.get('expense_amount')
        payer_ep_id = data.get('payer_ep_id')
        participants_ids = data.get('participants')
        expense_at = data.get('expense_at')
        description = data.get('description')
        split_method = data.get('split_method')


        if not category_name or not expense_amount or not payer_ep_id or not participants_ids or not expense_at:
            return jsonify({"success": False, "error": "入力してください"}), 400
        
        category_name = category_name.strip()

        try:
            expense_at = datetime.strptime(expense_at, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        try:
            expense_amount = Decimal(expense_amount)
        except InvalidOperation:
            return jsonify({"success": False, "error": "金額が不正です"}), 400
        
        if expense_amount <= 0:
            return jsonify({"success": False, "error": "金額が不正です"}), 400

        if event.start_date > expense_at or expense_at > event.end_date:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        if not Event_Participants.query.filter_by(event_id=event_id,event_participant_id=payer_ep_id).first():
            return jsonify({"success": False, "error": "立替人がイベント参加者ではありません"}), 400
        
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
        alloc_error = create_allocations(expenses.expense_id, event_id, expense_amount, split_method, participants_ids, data)
        if alloc_error:
            return jsonify({"success": False, "error": alloc_error}), 400

        db.session.commit()

        return jsonify({"success": True, "expense": expenses.to_dict()})

    else: 
        event = Events.query.get_or_404(event_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).all()
        return jsonify({"success": True, "event": event.to_dict(), "participants": [p.to_dict() for p in participants]})
    
#API支出編集ルート
@api.route('/api/events/<int:event_id>/expenses/<int:expense_id>', methods=['GET', 'PUT', 'DELETE'])
def api_expense_edit(event_id, expense_id):
    if not check_participant(event_id):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    if request.method == "GET":
        events = Events.query.get_or_404(event_id)
        expenses = Expenses.query.get_or_404(expense_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()
        categories = Expense_Categories.query.get(expenses.category_id)
        allocations = Allocations.query.filter_by(expense_id=expenses.expense_id).filter(Allocations.deleted_at.is_(None)).all()
        return jsonify({"success": True, "event": events.to_dict(), "expense": expenses.to_dict(), "participants": [p.to_dict() for p in participants], "category": categories.to_dict(), "allocations": [a.to_dict() for a in allocations]})
    if request.method == "PUT":
        event = Events.query.get_or_404(event_id)
        expenses = Expenses.query.get_or_404(expense_id)
        participants = Event_Participants.query.filter_by(event_id=event_id).filter(Event_Participants.deleted_at.is_(None)).all()
        categories = Expense_Categories.query.get(expenses.category_id)
        allocations = Allocations.query.filter_by(expense_id=expense_id).filter(Allocations.deleted_at.is_(None)).all()

        data = request.get_json()
        category_name = data.get('category_name')
        expense_amount = data.get('expense_amount')
        payer_ep_id = data.get('payer_ep_id')
        participants_ids = data.get('participants')
        expense_at = data.get('expense_at')
        description = data.get('description')
        split_method = data.get('split_method')


        if not category_name or not expense_amount or not payer_ep_id or not participants_ids or not expense_at:
            return jsonify({"success": False, "error": "入力してください"}), 400

        if split_method not in ["EQUAL","UNITS"]:
            return jsonify({"success": False, "error": "割り勘方式が不正です"}), 400

        try:
            expense_at = datetime.strptime(expense_at, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        try:
            expense_amount = Decimal(expense_amount)
        except InvalidOperation:
            return jsonify({"success": False, "error": "金額が不正です"}), 400

        if expense_amount <= 0:
            return jsonify({"success": False, "error": "金額が不正です"}), 400

        if event.start_date > expense_at or expense_at > event.end_date:
            return jsonify({"success": False, "error": "日付が不正です"}), 400

        if not Event_Participants.query.filter_by(event_id=event_id,event_participant_id=payer_ep_id).first():
            return jsonify({"success": False, "error": "立替人がイベント参加者ではありません"}), 400

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
        alloc_error = create_allocations(expense_id, event_id, expense_amount, split_method, participants_ids, data)
        if alloc_error:
            db.session.rollback()
            return jsonify({"success": False, "error": alloc_error}), 400
        db.session.commit()

        return jsonify({"success": True})
    
    else: #DELETE
        expense = Expenses.query.get_or_404(expense_id)
        expense.deleted_at = datetime.now()

        Allocations.query.filter_by(expense_id=expense_id).delete()

        db.session.commit()
        return jsonify({"success": True})
    
@api.route('/api/events/<int:event_id>/settlements',methods=['GET'])
def api_settlements(event_id):
    if not check_participant(event_id):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
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
            return jsonify({"success": False, "error": "内部エラー: 貸借の合計が0になっていません"}), 500

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
            return jsonify({"success": False, "error": "内部エラー: 貸借の計算に未処理があります"}), 500

        total_settlement = sum((s["amount"] for s in settlements), Decimal('0'))
        if total_settlement != original_credit_sum:
            return jsonify({"success": False, "error": "内部エラー: 精算金額の合計が債権の合計と一致しません"}), 500

        # 整合性チェック完了後にまとめて float 変換
        for s in settlements:
            s["amount"] = float(s["amount"])
        for item in settlement_summary:
            item["total_allocations"] = float(item["total_allocations"])
            item["total_paid"]        = float(item["total_paid"])
            item["net"]               = float(item["net"])

        return jsonify({"success": True, "settlements": settlements, "settlement_summary": settlement_summary, "participants": [p.to_dict() for p in participants]})
    

@api.route('/api/join', methods=['GET','POST'])
def api_join_event():
    if request.method == "GET":
        return jsonify({"success": True, "message": "Join event page"})
    
    data = request.get_json()
    invite_code = data.get('invite_code')
    if not invite_code or not invite_code.strip():
        return jsonify({"success": False, "error": "招待コードを入力してください"}), 400

    event = Events.query.filter_by(invite_code=invite_code.strip()).first()
    if event is None:
        return jsonify({"success": False, "error": "招待コードが無効です"}), 400

    unlinked = Event_Participants.query.filter_by(event_id=event.event_id, user_id=None).all()

    return jsonify({"success": True, "event": event.to_dict(), "unlinked": [ep.to_dict() for ep in unlinked]})



@api.route('/api/join/confirm/<int:event_id>', methods=['POST'])
def api_join_event_confirm(event_id):
    data = request.get_json()
    selected_ep_id = data.get('selected_ep_id')

    user_id = session.get("user_id")
    if user_id is None:
        user_id = guest_create()

    if selected_ep_id == "new":
        display_name = data.get('display_name')
        if not display_name or not display_name.strip():
            return jsonify({"success": False, "error": "表示名を入力してください"}), 400
        new_participant = Event_Participants(event_id=event_id, user_id=user_id, display_name=display_name, status='joined')
        db.session.add(new_participant)

    else:
        participant = Event_Participants.query.get(selected_ep_id)
        if participant is None:
            return jsonify({"success": False, "error": "参加者の選択が不正です"}), 400
        participant.user_id = user_id
        participant.status = 'joined'
        participant.joined_at = datetime.now()

    db.session.commit()
    return jsonify({"success": True, "message": "イベントに参加しました"})


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