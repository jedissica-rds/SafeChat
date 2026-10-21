
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Message, MessageStatus } from "../types/chat";
import { contacts, initialMessages } from "../data/mockData";
import {
  createMessage,
  updateMessageStatus,
} from "../service/chatService";

export function useChat() {
  const [activeId, setActiveId] = useState(1);
  const [messages, setMessages] = useState(initialMessages);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileConversation, setMobileConversation] = useState(false);

  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  const activeContact =
    contacts.find((contact) => contact.id === activeId) ?? contacts[0];

  const visibleContacts = contacts.filter((contact) =>
    contact.name
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR"))
  );

  function updateStatus(
    contactId: number,
    messageId: number,
    status: MessageStatus
  ) {
    setMessages((current) => ({
      ...current,
      [contactId]: updateMessageStatus(
        current[contactId] ?? [],
        messageId,
        status
      ),
    }));
  }

  function scheduleStatuses(contactId: number, messageId: number) {
    timers.current.push(
      window.setTimeout(
        () => updateStatus(contactId, messageId, "delivered"),
        900
      )
    );

    timers.current.push(
      window.setTimeout(
        () => updateStatus(contactId, messageId, "read"),
        1800
      )
    );
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) return;

    const message = createMessage(text);

    setMessages((current) => ({
      ...current,
      [activeId]: [...(current[activeId] ?? []), message],
    }));

    setDraft("");
    scheduleStatuses(activeId, message.id);
  }

  function resend(messageId: number) {
    updateStatus(activeId, messageId, "sent");
    scheduleStatuses(activeId, messageId);
  }

  function selectContact(contactId: number) {
    setActiveId(contactId);
    setMobileConversation(true);
  }

  return {
    contacts,
    activeId,
    activeContact,
    messages,
    query,
    draft,
    mobileConversation,
    visibleContacts,
    setQuery,
    setDraft,
    setMobileConversation,
    selectContact,
    sendMessage,
    resend,
  };
}
