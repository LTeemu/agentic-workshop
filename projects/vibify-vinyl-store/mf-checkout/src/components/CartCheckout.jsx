import { useState, useEffect, useCallback } from 'react';
import { on, emit } from '../../../shared/bus.js';
import { getCart, getTotal, removeFromCart, clearCart, setItemQty } from '../../../shared/cart.js';
import { confetti } from '../../../shared/confetti.js';
import './CartCheckout.css';

export default function CartCheckout() {
  const [items, setItems] = useState(() => getCart());
  const [form, setForm] = useState({ name: 'Demo User', email: 'demo@vibify.test' });
  const [submitted, setSubmitted] = useState(false);

  // Sync React state with the shared global-backed cart whenever bus events fire.
  useEffect(() => {
    const uns = [
      on('cart:add', () => setItems(getCart())),
      on('cart:remove', () => setItems(getCart())),
      on('cart:clear', () => setItems(getCart())),
    ];
    return () => uns.forEach((u) => u());
  }, []);

  const removeItem = useCallback((id) => {
    removeFromCart(id);
    setItems(getCart());
  }, []);

  const handleQtyChange = useCallback((id, qty) => {
    setItemQty(id, qty);
    setItems(getCart());
  }, []);

  const total = getTotal();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitted(true);
    emit('cart:purchased', { items, total, customer: form });
    confetti({ count: 150, spread: 100, duration: 3500 });
    clearCart();
    setItems(getCart());
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="checkout">
      <h2 className="checkout-title">Cart</h2>

      {items.length === 0 ? (
        <p className="checkout-empty">Your fake cart is empty. Browse the catalog to add vinyl.</p>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="cart-item-disc" style={{ backgroundImage: `url(${item.coverUrl || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: item.gradient }}>
                  <div className="cart-disc-hole" />
                </div>
                <div className="cart-item-info">
                  <span className="cart-item-title">{item.title}</span>
                  <span className="cart-item-artist">{item.artist}</span>
                </div>
                <select
                  className="cart-item-qty-select"
                  value={item.qty}
                  onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                  aria-label={`Quantity for ${item.title}`}
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <span className="cart-item-price">${(item.price * item.qty).toFixed(2)}</span>
                <button className="cart-remove" onClick={() => removeItem(item.id)} aria-label="Remove">
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-total">Total: ${total.toFixed(2)}</div>

          {!submitted ? (
            <form className="checkout-form" onSubmit={handleSubmit}>
              <h3 className="checkout-form-title">Checkout</h3>
              <input
                className="checkout-input"
                value={form.name}
                readOnly
                tabIndex={-1}
              />
              <input
                className="checkout-input"
                type="email"
                value={form.email}
                readOnly
                tabIndex={-1}
              />
              <button className="checkout-btn" type="submit">
                Purchase
              </button>
            </form>
          ) : (
            <p className="checkout-success">Purchase complete! Enjoy your vinyl.</p>
          )}
        </>
      )}
    </div>
  );
}
