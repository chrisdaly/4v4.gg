import React from "react";

const StyleReference = () => {
  return (
    <div style={{ padding: '40px', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1 style={{ color: '#fcdb33', marginBottom: '10px', fontFamily: 'Friz_Quadrata_Bold' }}>
        Style Reference
      </h1>
      <p style={{ color: '#888', marginBottom: '40px' }}>
        UI components and styles for future use
      </p>

      {/* WC3 Ornate Frame */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ color: '#4ade80', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          WC3 Ornate Frame (border-image)
        </h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '12px' }}>
          Uses /frames/wc3-frame.png with CSS border-image for 9-slice scaling
        </p>

        <div
          className="bg-wc3-frame"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            padding: '24px 32px',
            border: '30px solid transparent',
            borderImageSource: 'url(/frames/wc3-frame.png)',
            borderImageSlice: '80 fill',
            borderImageRepeat: 'stretch',
            display: 'inline-block',
          }}
        >
          <p style={{ color: '#fcdb33', fontFamily: 'Friz_Quadrata_Bold', margin: 0 }}>
            Content goes here - frame stretches to fit
          </p>
          <p style={{ color: '#888', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
            Adjust border-image-slice value based on corner size in image
          </p>
        </div>

        <pre style={{
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '4px',
          marginTop: '20px',
          color: '#888',
          fontSize: '12px',
          overflow: 'auto'
        }}>
{`.bg-wc3-frame {
  background: rgba(0, 0, 0, 0.85);
  padding: 24px 32px;
  border: 30px solid transparent;
  border-image-source: url('/frames/wc3-frame.png');
  border-image-slice: 80 fill;
  border-image-repeat: stretch;
}`}
        </pre>
      </section>

      {/* Background Styles */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ color: '#4ade80', marginBottom: '20px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Background Styles
        </h2>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Dark + Gold */}
          <div>
            <p style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>bg-dark-gold</p>
            <div className="minimal-overlay bg-dark-gold" style={{ padding: '20px 40px' }}>
              <span style={{ color: '#fcdb33' }}>Dark + Gold Border</span>
            </div>
          </div>

          {/* Gradient Fade */}
          <div>
            <p style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>bg-gradient-fade (current)</p>
            <div className="minimal-overlay bg-gradient-fade" style={{ padding: '20px 40px' }}>
              <span style={{ color: '#fcdb33' }}>Gradient Fade</span>
            </div>
          </div>

          {/* Frosted */}
          <div>
            <p style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>bg-frosted</p>
            <div className="minimal-overlay bg-frosted" style={{ padding: '20px 40px' }}>
              <span style={{ color: '#fcdb33' }}>Frosted Glass</span>
            </div>
          </div>
        </div>
      </section>

      {/* Team Colors */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ color: '#4ade80', marginBottom: '20px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Team Colors
        </h2>

        <div style={{ display: 'flex', gap: '40px' }}>
          <div>
            <div style={{
              borderLeft: '3px solid #3b82f6',
              paddingLeft: '12px',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#fcdb33', fontFamily: 'Friz_Quadrata_Bold' }}>Blue Team</span>
            </div>
            <p style={{ color: '#666', fontSize: '11px' }}>#3b82f6 - Streamer's team</p>
          </div>

          <div>
            <div style={{
              borderLeft: '3px solid #ef4444',
              paddingLeft: '12px',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#fcdb33', fontFamily: 'Friz_Quadrata_Bold' }}>Red Team</span>
            </div>
            <p style={{ color: '#666', fontSize: '11px' }}>#ef4444 - Enemy team</p>
          </div>
        </div>
      </section>

      {/* CSS Variables */}
      <section>
        <h2 style={{ color: '#4ade80', marginBottom: '20px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          CSS Variables
        </h2>

        <pre style={{
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '4px',
          color: '#888',
          fontSize: '12px',
          overflow: 'auto'
        }}>
{`--gold: #fcdb33;      /* Player names, highlights */
--green: #4ade80;     /* Wins, positive */
--red: #f87171;       /* Losses, negative */
--grey: #888;         /* Labels */
--text-primary: #fff;
--text-muted: #888;
--bg-dark: #0a0a0a;`}
        </pre>
      </section>
    </div>
  );
};

export default StyleReference;
