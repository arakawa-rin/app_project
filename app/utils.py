from flask import session
from decimal import Decimal, InvalidOperation, ROUND_DOWN, ROUND_HALF_UP
from models import db
from models.models import Users, Event_Participants, Allocations


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
    ).filter(Event_Participants.deleted_at.is_(None), Event_Participants.status != 'left').first()

#アクセスチェック(作成者)
def check_creater(event):
    user_id = session.get("user_id")
    if not user_id:
        return False
    return event.created_by == user_id

def allocate_integer_values(values, preferred_index=0):
    if not values:
        return []

    decimals = [Decimal(value) for value in values]
    floored = [
        int(value.quantize(Decimal('1'), rounding=ROUND_DOWN))
        for value in decimals
    ]
    target_total = int(
        sum(decimals, Decimal('0')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    )
    diff = target_total - sum(floored)

    if diff:
        index = preferred_index if 0 <= preferred_index < len(floored) else 0
        floored[index] += diff

    return floored

def build_integer_settlement_result(settlement_summary, preferred_ep_id=None):
    preferred_index = next(
        (
            index
            for index, item in enumerate(settlement_summary)
            if item["event_participant_id"] == preferred_ep_id
        ),
        0,
    )
    integer_paid = allocate_integer_values(
        [item["total_paid"] for item in settlement_summary],
        preferred_index=preferred_index,
    )
    integer_allocations = allocate_integer_values(
        [item["total_allocations"] for item in settlement_summary],
        preferred_index=preferred_index,
    )

    integer_summary = []
    for item, total_paid, total_allocations in zip(
        settlement_summary,
        integer_paid,
        integer_allocations,
    ):
        integer_summary.append({
            "event_participant_id": item["event_participant_id"],
            "display_name": item["display_name"],
            "total_allocations": total_allocations,
            "total_paid": total_paid,
            "net": total_paid - total_allocations,
        })

    balances = []
    for item in integer_summary:
        if item["net"] != 0:
            balances.append({
                "ep_id": item["event_participant_id"],
                "display_name": item["display_name"],
                "net": item["net"],
            })

    creditors = []
    debtors = []
    for balance in balances:
        if balance["net"] > 0:
            creditors.append(balance.copy())
        else:
            debtors.append(balance.copy())

    creditors.sort(key=lambda x: x["net"], reverse=True)
    debtors.sort(key=lambda x: x["net"])

    integer_settlements = []
    while creditors and debtors:
        creditor = creditors[0]
        debtor = debtors[0]
        amount = min(creditor["net"], -debtor["net"])
        integer_settlements.append({
            "payee_display_name": creditor["display_name"],
            "payer_display_name": debtor["display_name"],
            "amount": amount,
        })

        creditor["net"] -= amount
        debtor["net"] += amount

        if creditor["net"] == 0:
            creditors.pop(0)
        if debtor["net"] == 0:
            debtors.pop(0)

    return integer_summary, integer_settlements

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
