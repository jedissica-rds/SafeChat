
export type Screen = "login" | "chat";
export type AuthMode = "login" | "signup";

export type MessageStatus =
  | "sent"
  | "stored"
  | "delivered"
  | "read"
  | "failed";

export type Contact = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
};

export type Message = {
  id: string;
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
