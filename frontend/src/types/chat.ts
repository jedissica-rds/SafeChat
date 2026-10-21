
export type Screen = "login" | "chat";
export type AuthMode = "login" | "signup";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export type Contact = {
  id: number;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
};

export type Message = {
  id: number;
  text: string;
  mine: boolean;
  time: string;
  status?: MessageStatus;
};

export type Credentials = {
  user: string;
  password: string;
};

export type SignupData = Credentials & {
  confirm: string;
};
