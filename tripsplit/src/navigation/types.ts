export type HomeStackParamList = {
  EventList: undefined;
  EventDetail: { event_id: number};
  EventEdit: { event_id: number };
  ExpenseAdd: { event_id: number };
  ExpenseEdit: { event_id : number,expense_id: number };
  Settlement: { event_id: number };
};

export type CreateStackParamList = {
  EventCreate: undefined;
  JoinEvent: undefined;
  JoinConfirm: { event_id: number, invite_code: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};
