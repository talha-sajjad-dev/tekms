export default function TestInstallPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>BigCommerce Quote App - Installation Test</h1>
      
      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h2>✅ App is Deployed Successfully!</h2>
        <p>If you can see this page, your app is live and working.</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Environment Check:</h2>
        <ul>
          <li>Client ID: {process.env.BIGCOMMERCE_CLIENT_ID ? '✅ Configured' : '❌ Missing'}</li>
          <li>Client Secret: {process.env.BIGCOMMERCE_CLIENT_SECRET ? '✅ Configured' : '❌ Missing'}</li>
          <li>App URL: {process.env.BIGCOMMERCE_APP_URL || '❌ Missing'}</li>
          <li>JWT Secret: {process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', background: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
        <h2>OAuth Callback URLs (must match DevTools):</h2>
        <ul>
          <li><code>https://getquote-lilac.vercel.app/api/auth/callback</code></li>
          <li><code>https://getquote-lilac.vercel.app/api/load</code></li>
          <li><code>https://getquote-lilac.vercel.app/api/uninstall</code></li>
        </ul>
        <p>Go to <a href="https://devtools.bigcommerce.com" target="_blank">BigCommerce DevTools</a> and verify these URLs match exactly!</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Installation URL:</h2>
        <p>
          <a 
            href="https://login.bigcommerce.com/app/pfhxrri7i3kq82scfcclyl3mkqh5soj/install"
            style={{ 
              display: 'inline-block',
              background: '#007bff', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '6px', 
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Install App on BigCommerce
          </a>
        </p>
      </div>
    </div>
  )
}