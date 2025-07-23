import Head from 'next/head';
import App from '../components/App';

export default function Home() {
  return (
    <>
      <Head>
        <title>Vault Notes - Collaborative Notes</title>
        <meta name="description" content="Collaborative note-taking app for two users" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        </Head>
        <App />
      </>
  )
}
