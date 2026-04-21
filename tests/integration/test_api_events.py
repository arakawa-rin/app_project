"""
結合テスト: イベント API
  POST   /api/events
  GET    /api/events
  GET    /api/events/<id>
  PUT    /api/events/<id>
  DELETE /api/events/<id>
"""
import json
from datetime import date, timedelta


# ── POST /api/events ─────────────────────────────────────────────��────────────

class TestCreateEvent:
    def test_success(self, client):
        res = client.post('/api/events', json={
            'event_name': '新イベント',
            'start_date': '2024-07-01',
            'end_date':   '2024-07-03',
            'display_name': '太郎',
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'event_id' in data

    def test_missing_required_field(self, client):
        res = client.post('/api/events', json={
            'event_name': '新イベント',
            'start_date': '2024-07-01',
            # end_date なし
            'display_name': '太郎',
        })
        assert res.status_code == 400
        assert res.get_json()['success'] is False

    def test_invalid_date_format(self, client):
        res = client.post('/api/events', json={
            'event_name': '新イベント',
            'start_date': '2024/07/01',
            'end_date':   '2024/07/03',
            'display_name': '太郎',
        })
        assert res.status_code == 400

    def test_end_before_start(self, client):
        res = client.post('/api/events', json={
            'event_name': '新イベント',
            'start_date': '2024-07-05',
            'end_date':   '2024-07-01',
            'display_name': '太郎',
        })
        assert res.status_code == 400

    def test_creates_with_member_names(self, client):
        res = client.post('/api/events', json={
            'event_name': '旅行',
            'start_date': '2024-08-01',
            'end_date':   '2024-08-03',
            'display_name': '幹事',
            'member_names': ['花子', '次郎'],
        })
        assert res.status_code == 200
        assert res.get_json()['success'] is True


# ── GET /api/events ───────────────────────────────────────────────────────────

class TestListEvents:
    def test_requires_auth(self, client):
        res = client.get('/api/events')
        assert res.status_code == 401

    def test_returns_created_and_joined(self, auth_client, event, participant):
        res = auth_client.get('/api/events')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        ids = [e['event_id'] for e in data['created_events']]
        assert event.event_id in ids


# ── GET /api/events/<id> ──────────────────────────────────────────────────────

class TestGetEventDetail:
    def test_success(self, auth_client, event, participant):
        res = auth_client.get(f'/api/events/{event.event_id}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['event']['event_id'] == event.event_id

    def test_not_participant_returns_401(self, client, event):
        # 認証なし（別ユーザー）はアクセス不可
        res = client.get(f'/api/events/{event.event_id}')
        assert res.status_code == 401

    def test_nonexistent_event_returns_404(self, auth_client):
        res = auth_client.get('/api/events/99999')
        assert res.status_code == 404


# ── PUT /api/events/<id> ──────────────────────────────────────────────────────

class TestUpdateEvent:
    def test_success(self, auth_client, event, participant):
        res = auth_client.put(f'/api/events/{event.event_id}', json={
            'event_name':   '更新後イベント',
            'start_date':   str(event.start_date),
            'end_date':     str(event.end_date),
            'display_name': '更新太郎',
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['event']['event_name'] == '更新後イベント'

    def test_missing_field(self, auth_client, event, participant):
        res = auth_client.put(f'/api/events/{event.event_id}', json={
            'event_name': '更新後イベント',
            'start_date': str(event.start_date),
            # end_date なし
            'display_name': '更新太郎',
        })
        assert res.status_code == 400

    def test_non_creator_cannot_update(self, client, event, db):
        from models.models import Users, Event_Participants
        # 別ユーザーとして参加
        other = Users(user_name='other')
        db.session.add(other)
        db.session.flush()
        ep = Event_Participants(
            event_id=event.event_id,
            user_id=other.user_id,
            display_name='他の人',
            status='joined',
        )
        db.session.add(ep)
        db.session.commit()

        with client.session_transaction() as sess:
            sess['user_id'] = other.user_id

        res = client.put(f'/api/events/{event.event_id}', json={
            'event_name':   '乗っ取りイベント',
            'start_date':   str(event.start_date),
            'end_date':     str(event.end_date),
            'display_name': '他の人',
        })
        assert res.status_code == 401


# ── DELETE /api/events/<id> ───────────────────────────────────────────────────

class TestDeleteEvent:
    def test_success(self, auth_client, event, participant):
        res = auth_client.delete(f'/api/events/{event.event_id}')
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_non_creator_cannot_delete(self, client, event, db):
        from models.models import Users, Event_Participants
        other = Users(user_name='other')
        db.session.add(other)
        db.session.flush()
        ep = Event_Participants(
            event_id=event.event_id,
            user_id=other.user_id,
            display_name='他の人',
            status='joined',
        )
        db.session.add(ep)
        db.session.commit()

        with client.session_transaction() as sess:
            sess['user_id'] = other.user_id

        res = client.delete(f'/api/events/{event.event_id}')
        assert res.status_code == 401
