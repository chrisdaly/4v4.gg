import React, { useRef, useEffect } from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: -1000;
`;

const VideoBackground = styled.video`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  transform: translate(-55%, -50%) scale(1); /* Slight scale to cover potential gaps */
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
`;

const ResponsiveFullscreenVideoBackground = ({ children }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current) {
        const { width, height } = videoRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scale = Math.max(windowWidth / width, windowHeight / height);
        videoRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <VideoContainer>
        <VideoBackground ref={videoRef} autoPlay loop muted playsInline>
          <source src="/backgrounds/peace-in-ashenvale-world-of-warcraft-moewalls-com.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </VideoBackground>
      </VideoContainer>
      <ContentWrapper>{children}</ContentWrapper>
    </>
  );
};

export default ResponsiveFullscreenVideoBackground;
