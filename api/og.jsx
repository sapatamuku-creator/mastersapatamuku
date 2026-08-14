import React from 'react';
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(req) {
  try {
    const { searchParams } = new URL(req.url);

    // Kartu generik untuk marketplace (vendor/product) — dipakai sbg fallback OG image
    const kind = searchParams.get('kind');
    if (kind === 'vendor' || kind === 'product') {
      const cardName = String(searchParams.get('name') || 'Vendor Wedding').slice(0, 60);
      const cardSub = String(searchParams.get('sub') || 'Temukan vendor wedding terbaik di SapaTamu.id').slice(0, 90);
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #faf8f5 0%, #f3e7dd 55%, #eacfc0 100%)',
              fontFamily: 'sans-serif',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: 40, fontSize: 28, fontWeight: 'bold', letterSpacing: 6, color: '#1b5e43' }}>
              SAPATAMU.ID
            </div>
            <div style={{ display: 'flex', maxWidth: '82%', textAlign: 'center', fontSize: 72, fontWeight: 'bold', color: '#2c2420' }}>
              {cardName}
            </div>
            <div style={{ display: 'flex', maxWidth: '82%', textAlign: 'center', marginTop: 20, fontSize: 34, color: '#63574e' }}>
              {cardSub}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        },
      );
    }

    // Ambil data dari URL parameter
    const username = searchParams.get('u')?.toUpperCase() || 'TAMU UNDANGAN';
    const guestId = searchParams.get('id') || '00000';
    
    // URL Gambar Blanko dari folder assets Anda sendiri
    const bgImage = "https://sapatamu.id/assets/Blanko%20Blast%20WA.png";
    
    // URL QR Code dinamis
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${guestId}&size=200x200`;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            position: 'relative',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Overlay Nama Tamu */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '45%',
              transform: 'translate(-50%, -50%)',
              fontSize: 60,
              fontWeight: 'bold',
              color: '#C8962E',
              textAlign: 'center',
              width: '80%',
              fontStyle: 'italic',
            }}
          >
            {username}
          </div>

          {/* Overlay QR Code */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '15%',
              display: 'flex',
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '10px',
            }}
          >
            <img
              src={qrCodeUrl}
              width="180"
              height="180"
              alt="QR Code"
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
