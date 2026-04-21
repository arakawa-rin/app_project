"""
結合テスト共通 fixture
  - db        : app コンテキスト付き SQLAlchemy セッション
  - user      : テスト用ユーザー
  - event     : テスト用イベント
  - participant: テスト用参加者（user に紐づく）
  - auth_client: user_id をセッションにセットした test_client
"""
import pytest
from datetime import date, timedelta
from models import db as _db
from models.models import Users, Events, Event_Participants


@pytest.fixture()
def db(app):
    with app.app_context():
        yield _db


@pytest.fixture()
def user(db):
    u = Users(user_name='test_user')
    db.session.add(u)
    db.session.commit()
    return u


@pytest.fixture()
def event(db, user):
    today = date.today()
    e = Events(
        event_name='テストイベント',
        start_date=today,
        end_date=today + timedelta(days=2),
        created_by=user.user_id,
        invite_code='TEST01',
    )
    db.session.add(e)
    db.session.commit()
    return e


@pytest.fixture()
def participant(db, event, user):
    ep = Event_Participants(
        event_id=event.event_id,
        user_id=user.user_id,
        display_name='テストユーザー',
        status='joined',
    )
    db.session.add(ep)
    db.session.commit()
    return ep


@pytest.fixture()
def auth_client(client, user):
    """user_id をセッションにセットした test_client を返す"""
    with client.session_transaction() as sess:
        sess['user_id'] = user.user_id
    return client
