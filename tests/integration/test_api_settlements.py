"""
結合テスト: 精算 API
  GET /api/events/<id>/settlements
"""
from decimal import Decimal
from models.models import Expenses, Expense_Categories, Allocations
from models import db as _db
from .helpers import make_extra_participant


def _setup_expenses(db, event, ep1, ep2, ep3):
    """
    P1 が 1500 円を立替、P2 が 300 円を立替
    3 人均等割 → P1: +900, P2: -300, P3: -600
    """
    cat = Expense_Categories(event_id=event.event_id, category_name='費用')
    db.session.add(cat)
    db.session.flush()

    # P1 の支出 1500
    exp1 = Expenses(
        event_id=event.event_id,
        payer_ep_id=ep1.event_participant_id,
        expense_amount=Decimal('1500'),
        category_id=cat.category_id,
        expense_at=event.start_date,
    )
    db.session.add(exp1)
    db.session.flush()

    for ep, amt in [(ep1, '500'), (ep2, '500'), (ep3, '500')]:
        db.session.add(Allocations(
            expense_id=exp1.expense_id,
            event_participant_id=ep.event_participant_id,
            weight=1,
            allocation_amount=Decimal(amt),
        ))

    # P2 の支出 300
    exp2 = Expenses(
        event_id=event.event_id,
        payer_ep_id=ep2.event_participant_id,
        expense_amount=Decimal('300'),
        category_id=cat.category_id,
        expense_at=event.start_date,
    )
    db.session.add(exp2)
    db.session.flush()

    for ep, amt in [(ep1, '100'), (ep2, '100'), (ep3, '100')]:
        db.session.add(Allocations(
            expense_id=exp2.expense_id,
            event_participant_id=ep.event_participant_id,
            weight=1,
            allocation_amount=Decimal(amt),
        ))

    db.session.commit()


class TestGetSettlements:
    def test_requires_participant(self, client, event):
        res = client.get(f'/api/events/{event.event_id}/settlements')
        assert res.status_code == 401

    def test_no_expenses_returns_empty(self, auth_client, event, participant):
        res = auth_client.get(f'/api/events/{event.event_id}/settlements')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['settlements'] == []

    def test_settlement_amounts_correct(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        ep3 = make_extra_participant(db, event, '参加者3')
        _setup_expenses(db, event, participant, ep2, ep3)

        res = auth_client.get(f'/api/events/{event.event_id}/settlements')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True

        # P1 の正味受取額 = 900
        total_received = sum(
            s['amount'] for s in data['settlements']
            if s['payee_display_name'] == participant.display_name
        )
        assert total_received == 900

    def test_settlement_total_matches_net(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        ep3 = make_extra_participant(db, event, '参加者3')
        _setup_expenses(db, event, participant, ep2, ep3)

        res = auth_client.get(f'/api/events/{event.event_id}/settlements')
        data = res.get_json()

        # 支払い総額 == 受取総額
        total_paid    = sum(s['amount'] for s in data['settlements'])
        total_received = sum(s['amount'] for s in data['settlements'])
        assert total_paid == total_received

    def test_summary_contains_all_participants(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        ep3 = make_extra_participant(db, event, '参加者3')
        _setup_expenses(db, event, participant, ep2, ep3)

        res = auth_client.get(f'/api/events/{event.event_id}/settlements')
        data = res.get_json()

        ep_ids = {s['event_participant_id'] for s in data['settlement_summary']}
        assert participant.event_participant_id in ep_ids
        assert ep2.event_participant_id in ep_ids
        assert ep3.event_participant_id in ep_ids
