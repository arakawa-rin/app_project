export type HomeStackParamList = {
  EventList: undefined;
  EventDetail: { event_id: number};
  EventEdit: { event_id: number, event_participant_id: number };
  ExpenseAdd: { event_id: number };
  ExpenseEdit: { event_id : number,expense_id: number };
  Settlement: { event_id: number };
};

export type CreateStackParamList = {
  EventCreate: undefined;
  JoinEvent: undefined;
  JoinConfirm: {
    event: { event_id: number; invite_code: string; event_name: string; start_date: string; end_date: string };
    unlinked: { event_participant_id: number; display_name: string; status: string; user_id: number | null }[];
  };
};


export type SettingsStackParamList = {
  Settings: undefined;
};
