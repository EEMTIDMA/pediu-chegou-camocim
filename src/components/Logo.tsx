import React from 'react';
import { motion } from 'framer-motion';

export default function Logo({ size = 320 }: { size?: number }) { // Aumentado para 320
  const logoPath = '/logo.png';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px', 
        marginTop: '60px', // Desce mais o componente na tela
        width: '100%',     // Garante que ocupe a largura total disponível
      }}
    >
      {/* Container da Imagem com FORÇA no tamanho */}
      <motion.div
        initial={{ x: -150, opacity: 0 }}
        animate={{ 
          x: 0, 
          opacity: 1,
          y: [0, -2, 0, -1, 0] 
        }}
        transition={{ 
          x: { type: "spring", stiffness: 100, damping: 15 },
          opacity: { duration: 0.6 },
          y: { repeat: Infinity, duration: 0.3, ease: "linear" } 
        }}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          minWidth: `${size}px`, // Força o tamanho mínimo
          minHeight: `${size}px`, // Força o tamanho mínimo
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={logoPath}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.5))',
          }}
          alt="Logo Pediu Chegou Camocim"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://cdn-icons-png.flaticon.com';
          }}
        />

        {/* Farol Piscando Potente */}
        <motion.div
          animate={{ 
            opacity: [0, 1, 0.4, 1, 0],
            scale: [1, 1.8, 1.3, 1.8, 1] 
          }}
          transition={{ 
            duration: 1.8, 
            repeat: Infinity, 
            times: [0, 0.1, 0.2, 0.3, 1] 
          }}
          style={{
            position: 'absolute',
            top: '44%', 
            right: '18%',
            width: '35px', 
            height: '35px',
            backgroundColor: '#F9DC3E',
            borderRadius: '50%',
            filter: 'blur(12px)', 
            boxShadow: '0 0 40px #F9DC3E, 0 0 70px #F9DC3E',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      </motion.div>

      {/* Textos Estáticos */}
      <div style={{ textAlign: 'center', lineHeight: '0.8' }}>
        <div
          style={{
            fontWeight: '800',
            fontSize: '18px', // Aumentado um pouco para acompanhar
            color: '#FFFFFF',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          Pediu Chegou
        </div>
        <div
          style={{
            fontWeight: '900',
            fontSize: '62px', // Aumentado de 52 para 62
            color: '#F9DC3E',
            letterSpacing: '-2px',
            textTransform: 'uppercase',
            marginTop: '8px',
            fontFamily: 'sans-serif',
          }}
        >
          CAMOCIM
        </div>
      </div>
    </div>
  );
}
