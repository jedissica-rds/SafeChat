import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { MessageStatus } from "../types/chat";
import { contacts, initialMessages } from "../data/mockData";

import { getSession, getUser } from "../service/authService";
import { encryptMessage, decryptMessage } from "../service/chatEnconding";
import {
  getChats,
  getMessages,

import {
  getChats,
  getMessages,
  createChat,
  sendMessage as sendMessageToServer,
  type Chat,
  type StoredMessage,
} from "../service/chatService";
import type { Message } from "../types/chat";

type ChatMessages = Record<string, Message[]>;

type Contact = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
};

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

// Intervalos da atualização automática.
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

// Cacheia as chaves públicas dos usuários consultados.
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

// Em conversa 1:1, toda mensagem que não veio do contato é minha.
async function toDisplayMessage(
  item: StoredMessage,
  contactId: string | undefined,
  textCache: Map<string, string>,
): Promise<Message> {
  const mine = contactId ? item.fromId !== contactId : false;

  // Mensagens já descriptografadas não são processadas de novo a cada consulta.
  let text = textCache.get(item.id);

  if (text === undefined) {
    try {
      const privateKey = getSession()?.privateKey;

      if (!privateKey) {
        throw new Error("Sessão sem chave privada.");
      }

      text = await decryptMessage(
        {
          ciphertext: item.ciphertext,
          iv: item.iv,
          hmac: item.hmac,
          wrappedSessionKeys: mine
            ? [
                item.wrappedSessionKeyFrom,
                item.wrappedSessionKeyTo,
              ]
            : [
                item.wrappedSessionKeyTo,
                item.wrappedSessionKeyFrom,
              ],
        },
        privateKey,
      );

      textCache.set(item.id, text);
    } catch {
      text = "[Não foi possível descriptografar a mensagem]";
    }
  }

  return {
    id: item.id,
    text,
    mine,
    time: formatTime(item.sentAt),
    status: item.status === "stored" ? "sent" : item.status,
  };
}

export function useChat() {
  // Dados
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessages>({});

  // Permite achar o contato de uma conversa sem recriar callbacks a cada `chats`.
  const chatsRef = useRef<Chat[]>([]);
  chatsRef.current = chats;

  // Textos já descriptografados, por id de mensagem.
  const textCacheRef = useRef(new Map<string, string>());

  // Muda a cada envio, para descartar consultas que ficaram desatualizadas.
  const mutationRef = useRef(0);

  // Campos da interface
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileConversation, setMobileConversation] = useState(false);

  // Estados de carregamento
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchingContact, setSearchingContact] = useState(false);

  // Erros
  const [error, setError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Carrega as conversas do usuário autenticado.
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
        getErrorMessage(
          err,
          "Não foi possível carregar as conversas.",
        ),
      );
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  // Busca e descriptografa as mensagens de uma conversa.
  const fetchDisplayMessages = useCallback(
    async (chatId: string): Promise<Message[]> => {
      const result = await getMessages(chatId);

      const contactId = chatsRef.current.find(
        (chat) => chat.id === chatId,
      )?.contact.id;

      return Promise.all(
        result.map((item) =>
          toDisplayMessage(item, contactId, textCacheRef.current),
        ),
      );
    },
    [],
  );

  // Permite atualizar manualmente as mensagens.
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
          getErrorMessage(
            err,
            "Não foi possível carregar as mensagens.",
          ),
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchDisplayMessages],
  );

  // Carrega as mensagens quando uma conversa é selecionada.
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
            getErrorMessage(
              err,
              "Não foi possível carregar as mensagens.",
            ),
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

  // Atualização automática: busca novas mensagens da conversa aberta.
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

        // Descarta se saiu da conversa ou se um envio aconteceu no meio.
        if (cancelled || version !== mutationRef.current) return;

        setMessages((current) =>
          sameMessages(current[chatId] ?? [], displayMessages)
            ? current
            : { ...current, [chatId]: displayMessages },
        );
      } catch {
        // Falhas pontuais são ignoradas; a próxima consulta corrige.
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

  // Atualização automática: detecta conversas novas iniciadas por outras pessoas.
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
        // Ignora falhas pontuais.
      } finally {
        running = false;
      }
    }

    const timer = setInterval(() => void refreshChats(), CHAT_POLL_MS);

    return () => clearInterval(timer);
  }, []);

  // Transforma as conversas em contatos para a interface.
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

  // Filtra as conversas que já existem.
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

  // Busca um usuário pelo username exato e abre/cria a conversa.
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
        setSearchMessage(
          "Você não pode iniciar uma conversa consigo mesmo.",
        );
        return;
      }

      // Se já existe uma conversa, apenas abre.
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

      // Cria a conversa no backend.
      const newChat = await createChat({
        username: user.username,
      });

      // Atualiza a lista local mesmo se a recarga atrasar.
      setChats((current) =>
        current.some((chat) => chat.id === newChat.id)
          ? current
          : [...current, newChat],
      );

      setActiveId(newChat.id);
      setMobileConversation(true);
      setQuery("");

      // Atualiza os dados vindos do servidor.
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

  // Envia uma mensagem criptografada.
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

        if (!session.user.publicKey) {
          throw new Error(
            "A chave pública do usuário não foi encontrada.",
          );
        }

        const recipientPublicKey = await getPublicKey(
          contact.username,
        );

        const encrypted = await encryptMessage(
          text,
          session.user.publicKey,
          recipientPublicKey,
        );

        const saved = await sendMessageToServer({
          id: crypto.randomUUID(),
          chatId,
          wrappedSessionKeyFrom: encrypted.wrappedSessionKeyFrom,
          wrappedSessionKeyTo: encrypted.wrappedSessionKeyTo,
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext,
          hmac: encrypted.hmac,
          sentAt: new Date().toISOString(),
        });

        const displayMessage = await toDisplayMessage(
          saved,
          contact.id,
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
          getErrorMessage(
            err,
            "Não foi possível enviar a mensagem.",
          ),
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