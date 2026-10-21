
import { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { Brand } from "../components/Brand";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { MessageStatusView } from "../components/MessageStatusView";

type ChatScreenProps = {
  onLogout: () => void;
};

export default function ChatScreen({ onLogout }: ChatScreenProps) {
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
    sendMessage,
    resend,
  } = useChat();

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

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
              <strong>Joana Silva</strong>
            </div>

            <button
              className="logout-button"
              type="button"
              onClick={onLogout}
            >
              <Icon name="logout" size={16} />
              Sair
            </button>
          </div>

          <div className="search-field">
            <Icon name="search" size={18} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contatos"
              aria-label="Buscar contatos"
            />
          </div>

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
                Nenhuma conversa ainda
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

            <Avatar contact={activeContact} />

            <strong>{activeContact.name}</strong>

            <span className="encryption-label">
              <Icon name="lock" size={14} />
              Criptografia de ponta a ponta
            </span>
          </header>

          <div className="messages">
            {(messages[activeId]?.length ?? 0) === 0 ? (
              <p className="empty-state message-empty">
                Nenhuma mensagem aqui
              </p>
            ) : (
              messages[activeId].map((message) => (
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

          <form className="composer" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreva uma mensagem…"
              aria-label="Mensagem"
            />

            <button type="submit" aria-label="Enviar mensagem">
              <Icon name="send" size={20} />
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
