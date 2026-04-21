from decimal import Decimal

from models.models import Allocations, Event_Participants, Expense_Categories, Expenses


def make_extra_participant(db, event, name='参加者2'):
    """user_id なし（ゲスト）の追加参加者を作成して返す"""
    ep = Event_Participants(
        event_id=event.event_id,
        user_id=None,
        display_name=name,
        status='joined',
    )
    db.session.add(ep)
    db.session.commit()
    return ep


def make_expense(db, event, payer_ep, amount='900', expense_at=None):
    """カテゴリ・支出・均等割当を作成して返す"""
    cat = Expense_Categories(event_id=event.event_id, category_name='食費')
    db.session.add(cat)
    db.session.flush()

    exp = Expenses(
        event_id=event.event_id,
        payer_ep_id=payer_ep.event_participant_id,
        expense_amount=Decimal(amount),
        category_id=cat.category_id,
        expense_at=expense_at or event.start_date,
    )
    db.session.add(exp)
    db.session.flush()

    alloc = Allocations(
        expense_id=exp.expense_id,
        event_participant_id=payer_ep.event_participant_id,
        weight=1,
        allocation_amount=Decimal(amount),
    )
    db.session.add(alloc)
    db.session.commit()
    return exp
