export default function TransactionStatus({ status, message, txHash }) {
  if (!status) return null;

  const bgColors = {
    waiting: 'bg-[var(--color-yellow)]',
    mining: 'bg-[var(--color-yellow)]',
    success: 'bg-[var(--color-sage)]',
    error: 'bg-[#ff5f57]',
  };

  const textColors = {
    waiting: 'text-black',
    mining: 'text-black',
    success: 'text-black',
    error: 'text-white',
  };

  return (
    <div className={`p-4 border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] anim-in ${bgColors[status]}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {(status === 'waiting' || status === 'mining') && (
            <div className="spinner border-black border-t-black min-w-[16px]" />
          )}
          {status === 'success' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-black">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
          {status === 'error' && (
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
               <circle cx="12" cy="12" r="10"></circle>
               <line x1="12" y1="8" x2="12" y2="12"></line>
               <line x1="12" y1="16" x2="12.01" y2="16"></line>
             </svg>
          )}
          <span className={`text-sm font-bold uppercase ${textColors[status]}`}>
            {message}
          </span>
        </div>
        
        {status === 'mining' && txHash && (
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0_0_#000] font-bold text-black uppercase hover:bg-black hover:text-white transition-colors whitespace-nowrap"
          >
            Etherscan ↗
          </a>
        )}
      </div>
    </div>
  );
}
