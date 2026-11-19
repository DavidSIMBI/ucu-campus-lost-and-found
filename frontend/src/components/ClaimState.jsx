export function ClaimLoading({ children = 'Loading…' }) {
  return <p className="claim-state" role="status">{children}</p>;
}

export function ClaimError({ message, onRetry }) {
  return (
    <div className="claim-state claim-state-error" role="alert">
      <p>{message}</p>
      {onRetry && <button className="button button-small" type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}
