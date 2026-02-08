import React from "react";
import styled from "styled-components";

const Sidebar = styled.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`;

const HeaderTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const HeaderCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: 3px;
  }
`;

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  margin: 0 var(--space-1);
`;

const SkeletonAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const SkeletonLines = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SkeletonLine = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  width: ${(p) => p.$width || "100%"};
`;

function SkeletonGame() {
  return (
    <SkeletonRow>
      <SkeletonAvatar />
      <SkeletonLines>
        <SkeletonLine $width="75%" />
        <SkeletonLine $width="50%" />
      </SkeletonLines>
    </SkeletonRow>
  );
}

export default function ActiveGamesSidebar({ matchCount = 0 }) {
  return (
    <Sidebar>
      <Header>
        <HeaderTitle>Active Games</HeaderTitle>
        <HeaderCount>{matchCount}</HeaderCount>
      </Header>
      <Content>
        <SkeletonGame />
        <SkeletonGame />
        <SkeletonGame />
        <SkeletonGame />
        <SkeletonGame />
      </Content>
    </Sidebar>
  );
}
