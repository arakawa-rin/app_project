"""
結合テスト: 支出 API
  POST   /api/events/<id>/expenses
  GET    /api/events/<id>/expenses
  GET    /api/events/<id>/expenses/<exp_id>
  PUT    /api/events/<id>/expenses/<exp_id>
  DELETE /api/events/<id>/expenses/<exp_id>
"""
from .helpers import make_extra_participant, make_expense


# ── GET /api/events/<id>/expenses ────────────────────────────────────────────

class TestGetExpenseForm:
    def test_success(self, auth_client, event, participant):
        res = auth_client.get(f'/api/events/{event.event_id}/expenses')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'participants' in data

    def test_requires_participant(self, client, event):
        res = client.get(f'/api/events/{event.event_id}/expenses')
        assert res.status_code == 401


# ── POST /api/events/<id>/expenses ───────────────────────────────────────────

class TestAddExpense:
    def _post(self, client, event_id, payload):
        return client.post(f'/api/events/{event_id}/expenses', json=payload)

    def test_equal_split_success(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        payload = {
            'category_name':  '食費',
            'expense_amount': '900',
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id, ep2.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'EQUAL',
        }
        res = self._post(auth_client, event.event_id, payload)
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_units_split_success(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        payload = {
            'category_name':  '宿泊費',
            'expense_amount': '3000',
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id, ep2.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'UNITS',
            'unit_price':     '1000',
            f'units_{participant.event_participant_id}': 2,
            f'units_{ep2.event_participant_id}':         1,
        }
        res = self._post(auth_client, event.event_id, payload)
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_missing_required_field(self, auth_client, event, participant):
        res = self._post(auth_client, event.event_id, {
            'category_name':  '食費',
            # expense_amount なし
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'EQUAL',
        })
        assert res.status_code == 400

    def test_invalid_amount(self, auth_client, event, participant):
        res = self._post(auth_client, event.event_id, {
            'category_name':  '食費',
            'expense_amount': 'abc',
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'EQUAL',
        })
        assert res.status_code == 400

    def test_zero_amount(self, auth_client, event, participant):
        res = self._post(auth_client, event.event_id, {
            'category_name':  '食費',
            'expense_amount': '0',
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'EQUAL',
        })
        assert res.status_code == 400

    def test_expense_date_after_event_end(self, auth_client, event, participant):
        from datetime import timedelta
        future = str(event.end_date + timedelta(days=1))
        res = self._post(auth_client, event.event_id, {
            'category_name':  '食費',
            'expense_amount': '500',
            'payer_ep_id':    participant.event_participant_id,
            'participants':   [participant.event_participant_id],
            'expense_at':     future,
            'split_method':   'EQUAL',
        })
        assert res.status_code == 400

    def test_invalid_payer(self, auth_client, event, participant):
        res = self._post(auth_client, event.event_id, {
            'category_name':  '食費',
            'expense_amount': '500',
            'payer_ep_id':    99999,  # 存在しない参加者
            'participants':   [participant.event_participant_id],
            'expense_at':     str(event.start_date),
            'split_method':   'EQUAL',
        })
        assert res.status_code == 400

    def test_requires_participant(self, client, event):
        res = self._post(client, event.event_id, {})
        assert res.status_code == 401


# ── GET /api/events/<id>/expenses/<exp_id> ────────────────────────────────────

class TestGetExpenseDetail:
    def test_success(self, auth_client, event, participant, db):
        exp = make_expense(db, event, participant)
        res = auth_client.get(f'/api/events/{event.event_id}/expenses/{exp.expense_id}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['expense']['expense_id'] == exp.expense_id


# ── PUT /api/events/<id>/expenses/<exp_id> ────────────────────────────────────

class TestEditExpense:
    def test_success(self, auth_client, event, participant, db):
        ep2 = make_extra_participant(db, event, '参加者2')
        exp = make_expense(db, event, participant, amount='600')

        res = auth_client.put(
            f'/api/events/{event.event_id}/expenses/{exp.expense_id}',
            json={
                'category_name':  '交通費',
                'expense_amount': '1200',
                'payer_ep_id':    participant.event_participant_id,
                'participants':   [participant.event_participant_id, ep2.event_participant_id],
                'expense_at':     str(event.start_date),
                'split_method':   'EQUAL',
            },
        )
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_invalid_split_method(self, auth_client, event, participant, db):
        exp = make_expense(db, event, participant)
        res = auth_client.put(
            f'/api/events/{event.event_id}/expenses/{exp.expense_id}',
            json={
                'category_name':  '食費',
                'expense_amount': '900',
                'payer_ep_id':    participant.event_participant_id,
                'participants':   [participant.event_participant_id],
                'expense_at':     str(event.start_date),
                'split_method':   'INVALID',
            },
        )
        assert res.status_code == 400


# ── DELETE /api/events/<id>/expenses/<exp_id> ────────────────────────────────

class TestDeleteExpense:
    def test_success(self, auth_client, event, participant, db):
        exp = make_expense(db, event, participant)
        res = auth_client.delete(
            f'/api/events/{event.event_id}/expenses/{exp.expense_id}'
        )
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_requires_participant(self, client, event, participant, db):
        exp = make_expense(db, event, participant)
        res = client.delete(
            f'/api/events/{event.event_id}/expenses/{exp.expense_id}'
        )
        assert res.status_code == 401
