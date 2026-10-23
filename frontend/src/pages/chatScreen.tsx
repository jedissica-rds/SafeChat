
import { useEffect, useRef } from "react";

import { useChat } from "../hooks/useChat";
import { Brand } from "../components/Brand";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { MessageStatusView } from "../components/MessageStatusView";
import { getCurrentUser } from "../service/authService";

type ChatScreenProps = {
  onLogout: () => void;
};

export default function ChatScreen({ onLogout }: ChatScreenProps) {
  const currentUser = getCurrentUser();

  const {
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
    searchContact,
    sendMessage,
    resend,

    error,
    sending,
    searchingContact,
    searchMessage,
  } = useChat(currentUser?.username);

  const messageEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = activeId
    ? messages[activeId] ?? []
    : [];

  const canSend =
    Boolean(activeId) &&
    Boolean(activeContact) &&
    Boolean(draft.trim()) &&
    !sending;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [activeMessages.length, activeId]);

  function handleLogout() {
    onLogout();
  }

  return (
    <main className="chat-page">
      <section
        className={`chat-shell ${
          mobileConversation ? "show-conversation" : ""
        }`}
      >
        <aside className="sidebar">
          <div className="sidebar-brand">
            <Brand compact />
          </div>

          <div className="user-row">
            <div>
              <span>Conectado como</span>
              <strong>{currentUser?.name ?? "Usuário"}</strong>
            </div>

            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
            >
              <Icon name="logout" size={16} />
              Sair
            </button>
          </div>

          <form
            className="search-field"
            onSubmit={(event) => {
              event.preventDefault();
              void searchContact();
            }}
          >
            <Icon name="search" size={18} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pelo username"
              aria-label="Buscar contatos"
            />

            <button
              type="submit"
              disabled={searchingContact || !query.trim()}
            >
              {searchingContact ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {searchMessage && (
            <p className="error-message" role="status">
              {searchMessage}
            </p>
          )}

          <p className="section-label">Conversas</p>

          <div className="contact-list">
            {visibleContacts.length > 0 ? (
              visibleContacts.map((contact) => (
                <button
                  className={`contact-row ${
                    contact.id === activeId ? "active" : ""
                  }`}
                  type="button"
                  key={contact.id}
                  onClick={() => selectContact(contact.id)}
                >
                  <Avatar contact={contact} />

                  <span className="contact-copy">
                    <span>
                      <strong>{contact.name}</strong>
                      <time>{contact.time}</time>
                    </span>

                    <small>{contact.lastMessage}</small>
                  </span>
                </button>
              ))
            ) : (
              <p className="empty-state">
                {query.trim()
                  ? "Nenhuma conversa correspondente. Use Buscar para procurar um usuário pelo username."
                  : "Nenhuma conversa ainda"}
              </p>
            )}
          </div>
        </aside>

        <section className="conversation">
          <header className="conversation-header">
            <button
              className="icon-button back-button"
              type="button"
              onClick={() => setMobileConversation(false)}
              aria-label="Voltar para os contatos"
            >
              <Icon name="arrow" />
            </button>

            {activeContact ? (
              <>
                <Avatar contact={activeContact} />
                <strong>{activeContact.name}</strong>
              </>
            ) : (
              <strong>Selecione uma conversa</strong>
            )}

            {activeContact && (
              <span className="encryption-label">
                <Icon name="lock" size={14} />
                Criptografia de ponta a ponta
              </span>
            )}
          </header>

          <div className="messages">
            {!activeContact ? (
              <p className="empty-state message-empty">
                Selecione uma conversa para começar.
              </p>
            ) : activeMessages.length === 0 ? (
              <p className="empty-state message-empty">
                Nenhuma mensagem aqui
              </p>
            ) : (
              activeMessages.map((message) => (
                <div
                  className={`message-row ${
                    message.mine ? "mine" : "theirs"
                  }`}
                  key={message.id}
                >
                  <div className="bubble">
                    <p>{message.text}</p>

                    <span className="message-meta">
                      <time>{message.time}</time>

                      <MessageStatusView
                        status={message.status}
                      />

                      {message.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => resend(message.id)}
                        >
                          Reenviar
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}

            <div ref={messageEndRef} />
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <form className="composer" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                activeContact
                  ? "Escreva uma mensagem…"
                  : "Selecione uma conversa"
              }
              aria-label="Mensagem"
              disabled={!activeContact || sending}
            />

            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={!canSend}
            >
              <Icon name="send" size={20} />
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
