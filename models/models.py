from models import db

class Users(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)
    user_name = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text("1"))

class Events(db.Model):
    __tablename__ = 'events'
    event_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    event_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    invite_code = db.Column(db.CHAR(6), nullable=True, unique=True)
    created_by = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text("1"))

    def to_dict(self):
        return {
            "event_id": self.event_id,
            "event_name": self.event_name,
            "start_date": str(self.start_date),
            "end_date": str(self.end_date),
            "invite_code": self.invite_code,
            "created_by": self.created_by,
            "is_active": self.is_active
        }


class Event_Participants(db.Model):
    __tablename__ = 'event_participants'
    event_participant_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    event_id = db.Column(db.BigInteger, db.ForeignKey('events.event_id'), nullable=False)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)
    display_name = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(10), nullable=False, server_default='invited')
    joined_at = db.Column(db.DateTime, nullable=True)
    left_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "event_participant_id": self.event_participant_id,
            "display_name": self.display_name,
            "status": self.status,
            "user_id": self.user_id
        }

class Expense_Categories(db.Model):
    __tablename__ = 'expense_categories'
    category_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    event_id = db.Column(db.BigInteger, db.ForeignKey('events.event_id'), nullable=False)
    category_name = db.Column(db.String(100), nullable=False,)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)

    def to_dict(self):
        return {
            "category_id": self.category_id,
            "event_id": self.event_id,
            "category_name": self.category_name
        }

class Expenses(db.Model):
    __tablename__='expenses'
    expense_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    event_id = db.Column(db.BigInteger, db.ForeignKey('events.event_id'), nullable=False)
    payer_ep_id = db.Column(db.BigInteger, db.ForeignKey('event_participants.event_participant_id'), nullable=False)
    expense_amount = db.Column(db.Numeric(12,2),nullable=False)
    category_id = db.Column(db.BigInteger,db.ForeignKey('expense_categories.category_id'),nullable=True)
    description = db.Column(db.String(300), nullable=True)
    expense_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)

    def to_dict(self):
        return {
            "expense_id": self.expense_id,
            "event_id": self.event_id,
            "payer_ep_id": self.payer_ep_id,
            "expense_amount": str(self.expense_amount),
            "category_id": self.category_id,
            "description": self.description,
            "expense_at": self.expense_at.isoformat()
        }

class Allocations(db.Model):  
    __tablename__= 'allocations'
    allocation_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    expense_id = db.Column(db.BigInteger, db.ForeignKey('expenses.expense_id'), nullable=False)
    event_participant_id = db.Column(db.BigInteger, db.ForeignKey('event_participants.event_participant_id'), nullable=False)
    weight = db.Column(db.Integer,nullable=False,default=1)
    allocation_amount = db.Column(db.Numeric(12,2),nullable=False)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)

    def to_dict(self):
        return {
            "allocation_id": self.allocation_id,
            "expense_id": self.expense_id,
            "event_participant_id": self.event_participant_id,
            "weight": self.weight,
            "allocation_amount": str(self.allocation_amount)
        }

class Settlements(db.Model):
    __tablename__= 'settlements'
    __table_args__ = (
        db.UniqueConstraint('event_id','payer_ep_id','payee_ep_id', name='uq_settlement_pair'),
        db.CheckConstraint('payer_ep_id <> payee_ep_id', name='ck_payer_not_payee'),  
    )
    settlement_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    event_id = db.Column(db.BigInteger, db.ForeignKey('events.event_id'), nullable=False)
    payer_ep_id = db.Column(db.BigInteger, db.ForeignKey('event_participants.event_participant_id'), nullable=False)
    payee_ep_id = db.Column(db.BigInteger, db.ForeignKey('event_participants.event_participant_id'), nullable=False)
    total_amount = db.Column(db.Numeric(12,2),nullable=False)
    status = db.Column(db.String(10), nullable=False, server_default='unpaid')
    description = db.Column(db.String(300), nullable=True)
    settled_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.TIMESTAMP, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)