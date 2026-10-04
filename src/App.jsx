import { useEffect, useState } from "react";
import { ethers } from "ethers";

const ETHERSCAN_URL = "https://sepolia.etherscan.io";

const NETWORKS = {
  ethereum: { chainId: "0x1", rpc: "https://mainnet.infura.io/v3/", label: "Ethereum Mainnet" },
  sepolia: { chainId: "0xAA36A7", rpc: "https://sepolia.infura.io/v3/", label: "Sepolia Testnet" },
  localhost: { chainId: "0x539", rpc: "http://127.0.0.1:8545", label: "Localhost 8545" },
};

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [network, setNetwork] = useState("Sepolia Testnet");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [recentTxs, setRecentTxs] = useState([
    { type: "Received", amount: "+0.25 ETH", date: "Today, 09:45" },
    { type: "Sent", amount: "-0.12 ETH", date: "Yesterday, 18:20" },
    { type: "Received", amount: "+0.05 ETH", date: "Mon, 08:12" },
  ]);
  const [seedPhrase, setSeedPhrase] = useState("");
  const [importMode, setImportMode] = useState(false);
  const [name, setName] = useState("My Wallet");

  const formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Not connected";

  const refreshBalance = async (account, provider) => {
    try {
      const raw = await provider.getBalance(account);
      setBalance(ethers.formatEther(raw));
    } catch (error) {
      console.error(error);
      setStatus("Unable to fetch balance.");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("MetaMask is not installed.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      const networkInfo = await provider.getNetwork();

      setWalletAddress(account);
      setNetwork(networkInfo.name || "Unknown network");
      await refreshBalance(account, provider);
      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Wallet connection failed.");
    }
  };

  const createWalletFromSeed = () => {
    if (!seedPhrase.trim()) {
      setStatus("Enter a seed phrase to import a wallet.");
      return;
    }

    try {
      const wallet = ethers.Wallet.fromPhrase(seedPhrase.trim());
      setWalletAddress(wallet.address);
      setNetwork("Custom Seed Wallet");
      setStatus(`Imported wallet from seed phrase: ${formatAddress(wallet.address)}`);
      setImportMode(false);
    } catch (error) {
      console.error(error);
      setStatus("Invalid seed phrase.");
    }
  };

  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);

        if (accounts && accounts.length) {
          const account = accounts[0];
          const networkInfo = await provider.getNetwork();
          setWalletAddress(account);
          setNetwork(networkInfo.name || "Unknown network");
          await refreshBalance(account, provider);
        }
      } catch (error) {
        console.error("Auto-connect failed.", error);
      }
    };

    autoConnect();
  }, []);

  const copyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setStatus("Wallet address copied.");
    } catch {
      setStatus("Unable to copy address.");
    }
  };

  const sendTransaction = async () => {
    if (!walletAddress) {
      setStatus("Connect or import a wallet first.");
      return;
    }

    if (!recipient || !amount) {
      setStatus("Recipient and amount are required.");
      return;
    }

    setLoading(true);
    setStatus("");
    setTxHash("");

    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: recipient,
          value: ethers.parseEther(amount),
        });

        await tx.wait();
        setTxHash(tx.hash);
        setStatus("ETH sent successfully.");
        setRecentTxs((prev) => [{ type: "Sent", amount: `-${amount} ETH`, date: "Just now" }, ...prev]);
        const freshBalance = await provider.getBalance(walletAddress);
        setBalance(ethers.formatEther(freshBalance));
        setRecipient("");
        setAmount("");
      } else {
        setStatus("MetaMask is required for sending transactions.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Transaction failed. Check the address and network.");
    } finally {
      setLoading(false);
    }
  };

  const switchNetwork = async (networkKey) => {
    if (!window.ethereum) {
      setStatus("MetaMask is required to switch networks.");
      return;
    }

    const target = NETWORKS[networkKey];
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: target.chainId }],
      });
      setNetwork(target.label);
      setStatus(`Switched to ${target.label}.`);
    } catch (error) {
      console.error(error);
      setStatus(`Unable to switch to ${target.label}.`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #111827)", color: "#e2e8f0", fontFamily: "Arial, sans-serif", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: "#94a3b8", letterSpacing: 2, fontSize: 12, textTransform: "uppercase" }}>Ethereum Wallet App</div>
            <h1 style={{ margin: 8, fontSize: 36 }}>{name}</h1>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={network}
              onChange={(e) => {
                const key = Object.keys(NETWORKS).find((k) => NETWORKS[k].label === e.target.value);
                if (key) switchNetwork(key);
              }}
              style={{ background: "rgba(15,23,42,0.8)", color: "white", borderRadius: 12, border: "1px solid rgba(148,163,184,0.2)", padding: "12px 16px" }}
            >
              {Object.values(NETWORKS).map((item) => (
                <option key={item.label} value={item.label}>{item.label}</option>
              ))}
            </select>

            <button onClick={connectWallet} style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white", border: "none", borderRadius: 12, padding: "12px 18px", fontWeight: "bold", cursor: "pointer" }}>
              {walletAddress ? "Reconnect Wallet" : "Connect Wallet"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
          <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: 26, padding: 24, border: "1px solid rgba(148,163,184,0.15)", boxShadow: "0 20px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Balance</div>
                <div style={{ fontSize: 42, fontWeight: "bold", marginTop: 10 }}>{Number(balance).toFixed(4)} ETH</div>
              </div>
              <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(134,239,172,0.2)", borderRadius: 999, padding: "10px 16px", color: "#86efac", fontWeight: "bold" }}>
                +12.4% this month
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 26 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 18 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Income</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: "bold", color: "#4ade80" }}>$18.2k</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 18 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Spending</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: "bold", color: "#f87171" }}>$7.5k</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 18 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Net</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: "bold" }}>$10.7k</div>
              </div>
            </div>

            <div style={{ marginTop: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ color: "#94a3b8" }}>Wallet address</div>
                <button onClick={copyAddress} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 10, color: "#e2e8f0", padding: "8px 12px", cursor: "pointer" }}>
                  Copy
                </button>
              </div>

              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, wordBreak: "break-all" }}>
                {walletAddress || "Not connected"}
              </div>

              <div style={{ marginTop: 18, color: "#94a3b8" }}>
                Network: {network || "Not available"}
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: 26, padding: 24, border: "1px solid rgba(148,163,184,0.15)", boxShadow: "0 20px 30px rgba(0,0,0,0.25)" }}>
            <h3 style={{ marginTop: 0 }}>Send ETH</h3>

            <label style={{ display: "block", color: "#94a3b8", marginTop: 16 }}>Recipient</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0xA1b2..." style={{ width: "100%", marginTop: 8, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, color: "white", padding: "12px 14px" }} />

            <label style={{ display: "block", color: "#94a3b8", marginTop: 16 }}>Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.0001" min="0" placeholder="0.05" style={{ width: "100%", marginTop: 8, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, color: "white", padding: "12px 14px" }} />

            <button onClick={sendTransaction} disabled={loading || !walletAddress} style={{ width: "100%", marginTop: 22, background: loading ? "#64748b" : "linear-gradient(135deg, #22c55e, #16a34a)", color: "white", border: "none", borderRadius: 12, padding: "14px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Sending..." : "Send ETH"}
            </button>

            {status && <div style={{ marginTop: 18, color: status.includes("failed") ? "#fca5a5" : "#86efac" }}>{status}</div>}

            {txHash && (
              <div style={{ marginTop: 18, wordBreak: "break-all" }}>
                <div style={{ color: "#94a3b8", marginBottom: 6 }}>Transaction hash</div>
                <a href={`${ETHERSCAN_URL}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>{txHash}</a>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, background: "rgba(15,23,42,0.9)", borderRadius: 26, padding: 24, border: "1px solid rgba(148,163,184,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Recent transactions</h3>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>Live</div>
          </div>

          {recentTxs.map((tx, index) => (
            <div key={`${tx.type}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: tx.type === "Received" ? "#22c55e" : "#f97316" }} />
                <div>
                  <div style={{ fontWeight: "bold" }}>{tx.type}</div>
                  <small style={{ color: "#94a3b8" }}>{tx.date}</small>
                </div>
              </div>
              <div style={{ color: tx.type === "Received" ? "#4ade80" : "#facc15", fontWeight: "bold" }}>{tx.amount}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, background: "rgba(15,23,42,0.9)", borderRadius: 26, padding: 24, border: "1px solid rgba(148,163,184,0.15)" }}>
          <h3 style={{ marginTop: 0 }}>Import wallet from seed phrase</h3>
          <textarea value={seedPhrase} onChange={(e) => setSeedPhrase(e.target.value)} placeholder="seed phrase here" style={{ width: "100%", minHeight: 92, resize: "vertical", background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, color: "white", padding: "12px 14px" }} />
          <button onClick={createWalletFromSeed} style={{ marginTop: 14, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: 12, padding: "12px 18px", fontWeight: "bold", cursor: "pointer" }}>
            Import wallet
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
