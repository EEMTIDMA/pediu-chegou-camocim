import React from 'react';

export default function Logo({ size = 120 }: { size?: number }) {
  const logoPath = '/logo.png';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
      }}
    >
      <div style={{ width: size, height: size, marginBottom: '5px' }}>
        <img
          src={logoPath}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.4))',
          }}
          alt="Logo Pediu Chegou Camocim"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://cdn-icons-png.flaticon.com';
          }}
        />
      </div>
      <div style={{ textAlign: 'center', lineHeight: '0.9' }}>
        <div
          style={{
            fontWeight: '800',
            fontSize: '16px',
            color: '#FFFFFF',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          Pediu Chegou
        </div>
        <div
          style={{
            fontWeight: '900',
            fontSize: '52px',
            color: '#F9DC3E',
            letterSpacing: '-2px',
            textTransform: 'uppercase',
            marginTop: '4px',
            fontFamily: 'sans-serif',
          }}
        >
          CAMOCIM
        </div>
      </div>
    </div>
  );
}
