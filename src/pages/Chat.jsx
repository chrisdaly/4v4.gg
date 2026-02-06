import React from "react";
import styled from "styled-components";
import useChatStream from "../lib/useChatStream";
import ChatPanel from "../components/ChatPanel";

const Page = styled.div`
  padding: var(--space-4) var(--space-4) 0;
`;

const Chat = () => {
  const { messages, status } = useChatStream();

  return (
    <Page>
      <ChatPanel messages={messages} status={status} />
    </Page>
  );
};

export default Chat;
