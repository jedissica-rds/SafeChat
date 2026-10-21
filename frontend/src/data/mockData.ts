
import type { Contact, Message } from "../types/chat";

export const contacts: Contact[] = [
  {
    id: 1,
    name: "Marina Costa",
    initials: "MC",
    color: "lilac",
    lastMessage: "Perfeito, nos falamos amanhã!",
    time: "10:42",
  },
  {
    id: 2,
    name: "Lucas Mendes",
    initials: "LM",
    color: "mint",
    lastMessage: "A foto ficou linda",
    time: "09:18",
  },
  {
    id: 3,
    name: "Ana Clara",
    initials: "AC",
    color: "peach",
    lastMessage: "Obrigada por avisar",
    time: "Ontem",
  },
  {
    id: 4,
    name: "Rafael Lima",
    initials: "RL",
    color: "blue",
    lastMessage: "Vamos marcar sim",
    time: "Seg",
  },
];

export const initialMessages: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Oi! Tudo bem por aí?", mine: false, time: "10:36" },
    {
      id: 2,
      text: "Tudo ótimo! Acabei de terminar o projeto.",
      mine: true,
      time: "10:38",
      status: "read",
    },
    {
      id: 3,
      text: "Que notícia boa! Sabia que você ia conseguir.",
      mine: false,
      time: "10:40",
    },
    {
      id: 4,
      text: "Perfeito, nos falamos amanhã!",
      mine: false,
      time: "10:42",
    },
  ],
  2: [
    {
      id: 5,
      text: "A foto ficou linda, adorei a luz!",
      mine: false,
      time: "09:18",
    },
  ],
  3: [
    {
      id: 6,
      text: "Obrigada por avisar com antecedência.",
      mine: false,
      time: "Ontem",
    },
    {
      id: 7,
      text: "Você recebeu o documento?",
      mine: true,
      time: "Ontem",
      status: "failed",
    },
  ],
  4: [],
};
