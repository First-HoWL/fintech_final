import { useState } from 'react'
import { BrowserProvider, Contract, formatEther } from 'ethers'
import './App.css'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: () => void) => void
      removeListener?: (event: string, handler: () => void) => void
    }
  }
}

const escrowAddress = import.meta.env.VITE_ESCROW_ADDRESS
const escrowAbi = [
  'function getAllItems() view returns (tuple(uint id, string name, uint price, uint count)[])',
  'function take(uint id, uint count) payable',
]

type Item = { id: bigint; name: string; price: bigint; count: bigint }

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [account, setAccount] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('Connect a wallet to browse the stock.')

  async function connectWallet() {
    if (!window.ethereum) {
      setMessage('MetaMask was not detected in this browser.')
      return
    }
    if (!escrowAddress) {
      setMessage('Set VITE_ESCROW_ADDRESS before connecting the store.')
      return
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new Contract(escrowAddress, escrowAbi, signer)
      const [address, rawItems] = await Promise.all([
        signer.getAddress(),
        contract.getAllItems(),
      ])
      setAccount(address)
      setItems(rawItems.map((item: Item) => ({
        id: BigInt(item.id),
        name: item.name,
        price: BigInt(item.price),
        count: BigInt(item.count),
      })))
      setMessage('Ready to purchase from the local Escrow contract.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to the wallet.')
    }
  }

  async function buy(item: Item) {
    if (!window.ethereum || !escrowAddress) return
    const quantity = quantities[item.id.toString()] ?? 1
    setBusyId(item.id.toString())
    setMessage(`Waiting for confirmation for ${quantity} ${item.name}${quantity === 1 ? '' : 's'}...`)
    try {
      const provider = new BrowserProvider(window.ethereum)
      const contract = new Contract(escrowAddress, escrowAbi, await provider.getSigner())
      const transaction = await contract.take(item.id, quantity, {
        value: item.price * BigInt(quantity),
      })
      await transaction.wait()
      setItems((current) => current.map((currentItem) => currentItem.id === item.id
        ? { ...currentItem, count: currentItem.count - BigInt(quantity) }
        : currentItem))
      setMessage('Purchase confirmed on-chain.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Purchase failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="store-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">E</span><span>ESCROW / MARKET</span></div>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          <span className="wallet-dot" />{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect wallet'}
        </button>
      </header>
      <section className="intro">
        <p className="eyebrow">ON-CHAIN PROVISIONS / TESTNET STORE</p>
        <h1>Buy it. <em>Own the receipt.</em></h1>
        <p className="lede">A small storefront for checking the Escrow contract in real time. Every order updates stock and settles in ETH.</p>
      </section>
      <div className="status"><span className="status-light" />{message}</div>
      <section className="catalog">
        {items.length === 0 ? <div className="empty"><strong>Your catalog is waiting.</strong><span>Connect MetaMask to load the deployed items.</span></div> : items.map((item) => {
          const key = item.id.toString()
          const quantity = quantities[key] ?? 1
          const soldOut = item.count === 0n
          return <article className="product" key={key}>
            <div className="product-art"><span>{item.name.slice(0, 1)}</span><small>ITEM {key.padStart(2, '0')}</small></div>
            <div className="product-info"><div className="product-title"><h2>{item.name}</h2><span className={soldOut ? 'sold-out' : ''}>{soldOut ? 'SOLD OUT' : `${item.count} IN STOCK`}</span></div><p>Freshly listed on the Escrow inventory.</p><div className="product-buy"><strong>{formatEther(item.price)} ETH</strong><div className="quantity"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantities({ ...quantities, [key]: Math.max(1, quantity - 1) })}>−</button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantities({ ...quantities, [key]: Math.min(Number(item.count), quantity + 1) })}>+</button></div><button className="buy-button" type="button" disabled={soldOut || quantity > Number(item.count) || busyId === key} onClick={() => buy(item)}>{busyId === key ? 'Confirming...' : 'Buy now'}</button></div></div>
          </article>
        })}
      </section>
      <footer><span>ESCROW CONTRACT</span><code>{escrowAddress || 'VITE_ESCROW_ADDRESS not set'}</code><span>LOCAL CHECKOUT / ETH</span></footer>
    </main>
  )
}

export default App
