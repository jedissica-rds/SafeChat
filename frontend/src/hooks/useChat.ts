
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { getSession, getUser } from "../service/authService";
import { encryptMessage, decryptMessage } from "../service/chatEnconding";
import {
  getChats,
  getMessages,
  createChat,
  sendMessage as sendMessageToServer,
  type Chat,
  type StoredMessage,
} from "../service/chatService";
import type { EncryptedMessageEnvelope } from "../crypto/types";
import type { Message, MessageStatus } from "../types/chat";

type ChatMessages = Record<string, Message[]>;

type Contact = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
};

function toMessageStatus(status: string): MessageStatus {
  switch (status) {
    case "stored":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    default:
      return "sent";
  }
}

function formatTime(date?: string): string {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

const MESSAGE_POLL_MS = 3000;
const CHAT_POLL_MS = 10000;

function sameMessages(a: Message[], b: Message[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => item.id === b[i].id && item.status === b[i].status)
  );
}

function sameChats(a: Chat[], b: Chat[]): boolean {
  return a.length === b.length && a.every((item, i) => item.id === b[i].id);
}

const publicKeyCache = new Map<string, string>();

async function getPublicKey(username: string): Promise<string> {
  const cached = publicKeyCache.get(username);
  if (cached) return cached;

  const user = await getUser(username);

  if (!user.publicKey) {
    throw new Error("A chave pública do usuário não foi encontrada.");
  }

  publicKeyCache.set(username, user.publicKey);
  return user.publicKey;
}

async function toDisplayMessage(
  item: StoredMessage,
  contactId: string | undefined,
  chatId: string,
  textCache: Map<string, string>,
): Promise<Message> {
  const session = getSession();
  const mine = contactId ? item.fromId !== contactId : false;

  let text = textCache.get(item.id);

  if (text === undefined) {
    try {
      if (!session?.privateKey) {
        throw new Error("Sessão sem chave privada.");
      }

      if (!session.user.id) {
        throw new Error(
          "O login não retornou o ID do usuário. Verifique a resposta do backend.",
        );
      }

      // O envelope precisa manter os mesmos metadados usados no HMAC.
      const envelope: EncryptedMessageEnvelope = {
        id: item.id,
        chatId: item.chatId || chatId,
        fromId: item.fromId,
        toId: item.toId,
        keyDerivationSalt: item.keyDerivationSalt,
        wrappedSessionKeyFrom: item.wrappedSessionKeyFrom,
        wrappedSessionKeyTo: item.wrappedSessionKeyTo,
        iv: item.iv,
        ciphertext: item.ciphertext,
        hmac: item.hmac,
        sentAt: item.sentAt,
        seq: item.seq,
        status: item.status,
      };

      const wrappedSessionKey = mine
        ? item.wrappedSessionKeyFrom
        : item.wrappedSessionKeyTo;

      text = await decryptMessage(
        envelope,
        wrappedSessionKey,
        session.privateKey,
      );

      textCache.set(item.id, text);
    } catch (err) {
      console.error(`Falha ao descriptografar a mensagem ${item.id}:`, err);
      text = "[Não foi possível descriptografar a mensagem]";
    }
  }

  return {
    id: item.id,
    text,
    mine,
    time: formatTime(item.sentAt),
    status: toMessageStatus(item.status),
  };
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessages>({});

  const chatsRef = useRef<Chat[]>([]);
  chatsRef.current = chats;

  const textCacheRef = useRef(new Map<string, string>());
  const mutationRef = useRef(0);

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileConversation, setMobileConversation] = useState(false);

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchingContact, setSearchingContact] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setError(null);

    try {
      const result = await getChats();
      setChats(result);

      setActiveId((current) =>
        current && result.some((chat) => chat.id === current)
          ? current
          : result[0]?.id ?? null,
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Não foi possível carregar as conversas."),
      );
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const fetchDisplayMessages = useCallback(
    async (chatId: string): Promise<Message[]> => {
      const result = await getMessages(chatId);
      const contactId = chatsRef.current.find(
        (chat) => chat.id === chatId,
      )?.contact.id;

      return Promise.all(
        result.map((item) =>
          toDisplayMessage(
            item,
            contactId,
            chatId,
            textCacheRef.current,
          ),
        ),
      );
    },
    [],
  );

  const loadConversationMessages = useCallback(
    async (chatId: string) => {
      setLoadingMessages(true);
      setError(null);

      try {
        const displayMessages = await fetchDisplayMessages(chatId);

        setMessages((current) => ({
          ...current,
          [chatId]: displayMessages,
        }));
      } catch (err) {
        setError(
          getErrorMessage(err, "Não foi possível carregar as mensagens."),
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchDisplayMessages],
  );

  useEffect(() => {
    if (!activeId) {
      setLoadingMessages(false);
      return;
    }

    const chatId = activeId;
    let cancelled = false;

    async function load() {
      setLoadingMessages(true);
      setError(null);

      try {
        const displayMessages = await fetchDisplayMessages(chatId);

        if (!cancelled) {
          setMessages((current) => ({
            ...current,
            [chatId]: displayMessages,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Não foi possível carregar as mensagens."),
          );
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeId, fetchDisplayMessages]);

  useEffect(() => {
    if (!activeId) return;

    const chatId = activeId;
    let cancelled = false;
    let running = false;

    async function refresh() {
      if (running || document.hidden) return;

      running = true;
      const version = mutationRef.current;

      try {
        const displayMessages = await fetchDisplayMessages(chatId);

        if (cancelled || version !== mutationRef.current) return;

        setMessages((current) =>
          sameMessages(current[chatId] ?? [], displayMessages)
            ? current
            : { ...current, [chatId]: displayMessages },
        );
      } catch {
        // Falhas pontuais são recuperadas na próxima consulta.
      } finally {
        running = false;
      }
    }

    const onVisible = () => void refresh();
    const timer = setInterval(onVisible, MESSAGE_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, fetchDisplayMessages]);

  useEffect(() => {
    let running = false;

    async function refreshChats() {
      if (running || document.hidden) return;

      running = true;

      try {
        const result = await getChats();
        setChats((current) =>
          sameChats(current, result) ? current : result,
        );
      } catch {
        // Falhas pontuais são recuperadas na próxima consulta.
      } finally {
        running = false;
      }
    }

    const timer = setInterval(
      () => void refreshChats(),
      CHAT_POLL_MS,
    );

    return () => clearInterval(timer);
  }, []);

  const contacts = useMemo<Contact[]>(
    () =>
      chats.map((chat) => {
        const name = chat.contact.name || chat.contact.username;
        const lastMessage = messages[chat.id]?.at(-1);

        return {
          id: chat.id,
          name,
          initials: getInitials(name),
          color: "#64748b",
          lastMessage: lastMessage?.text ?? "",
          time: lastMessage?.time ?? "",
        };
      }),
    [chats, messages],
  );

  const activeContact =
    contacts.find((contact) => contact.id === activeId) ?? null;

  const visibleContacts = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");

    return contacts.filter((contact) =>
      contact.name.toLocaleLowerCase("pt-BR").includes(search),
    );
  }, [contacts, query]);

  const selectContact = useCallback((chatId: string) => {
    setActiveId(chatId);
    setMobileConversation(true);
    setSearchMessage(null);
  }, []);

  const searchContact = useCallback(async () => {
    const username = query.trim();

    if (!username) {
      setSearchMessage("Digite o username do usuário.");
      return;
    }

    const session = getSession();

    if (!session) {
      setSearchMessage("Sessão expirada. Entre novamente.");
      return;
    }

    setSearchingContact(true);
    setSearchMessage(null);
    setError(null);

    try {
      const user = await getUser(username);

      if (
        user.username.toLocaleLowerCase() ===
        session.user.username.toLocaleLowerCase()
      ) {
        setSearchMessage("Você não pode iniciar uma conversa consigo mesmo.");
        return;
      }

      const existingChat = chats.find(
        (chat) =>
          chat.contact.username.toLocaleLowerCase() ===
          user.username.toLocaleLowerCase(),
      );

      if (existingChat) {
        selectContact(existingChat.id);
        setQuery("");
        return;
      }

      const newChat = await createChat({ username: user.username });

      setChats((current) =>
        current.some((chat) => chat.id === newChat.id)
          ? current
          : [...current, newChat],
      );

      setActiveId(newChat.id);
      setMobileConversation(true);
      setQuery("");
      void loadChats();
    } catch (err) {
      setSearchMessage(
        getErrorMessage(
          err,
          "Não foi possível encontrar o usuário ou criar a conversa.",
        ),
      );
    } finally {
      setSearchingContact(false);
    }
  }, [query, chats, selectContact, loadChats]);

  const sendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();
      if (!text || !activeId || sending) return;

      const chatId = activeId;

      mutationRef.current += 1;
      setSending(true);
      setError(null);

      try {
        const session = getSession();
        const contact = chats.find(
          (chat) => chat.id === chatId,
        )?.contact;

        if (!session) {
          throw new Error("Sessão expirada. Entre novamente.");
        }

        if (!contact) {
          throw new Error("Conversa não encontrada.");
        }

        if (!session.user.id) {
          throw new Error(
            "O backend precisa retornar o ID do usuário no login.",
          );
        }

        if (!session.user.publicKey) {
          throw new Error("A chave pública do usuário não foi encontrada.");
        }

        const recipientPublicKey = await getPublicKey(contact.username);

        const encrypted = await encryptMessage(
          text,
          {
            chatId,
            fromId: session.user.id,
            toId: contact.id,
          },
          session.user.publicKey,
          recipientPublicKey,
        );

        const saved = await sendMessageToServer({
          ...encrypted,
          chatId,
        });

        // Usa a mensagem persistida pelo servidor para validar o envelope.
        const displayMessage = await toDisplayMessage(
          saved,
          contact.id,
          chatId,
          textCacheRef.current,
        );

        setMessages((current) => ({
          ...current,
          [chatId]: [
            ...(current[chatId] ?? []),
            displayMessage,
          ],
        }));

        mutationRef.current += 1;
        setDraft("");
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        setError(
          getErrorMessage(err, "Não foi possível enviar a mensagem."),
        );
      } finally {
        setSending(false);
      }
    },
    [activeId, chats, draft, sending],
  );

  const resend = useCallback(async (messageId: string) => {
    setError(
      `O reenvio da mensagem ${messageId} ainda precisa ser implementado.`,
    );
  }, []);

  return {
    contacts,
    visibleContacts,
    activeId,
    activeContact,
    messages,

    query,
    draft,
    mobileConversation,

    loadingChats,
    loadingMessages,
    sending,
    searchingContact,
    error,
    searchMessage,

    setQuery,
    setDraft,
    setMobileConversation,

    selectContact,
    searchContact,
    sendMessage,
    resend,

    reloadChats: loadChats,
    reloadMessages: loadConversationMessages,
  };
}
