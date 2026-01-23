import React from "react";

/**
 * FormDots - Displays win/loss form as colored dots
 * @param {boolean[]} form - Array of booleans (true = win, false = loss), oldest first
 * @param {string} size - "small" (default), "medium", or "large"
 */
const FormDots = ({ form, size = "small" }) => {
  if (!form || form.length === 0) return null;

  return (
    <div className={`form-dots ${size}`}>
      {form.map((won, i) => (
        <span
          key={i}
          className={`form-dot ${won ? "win" : "loss"} ${i === form.length - 1 ? "latest" : ""}`}
        />
      ))}
    </div>
  );
};

export default FormDots;
