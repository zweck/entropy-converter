import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const paperContent = `
# Time as Entropy Conversion
## A Dual-Entropy Model of the Arrow of Time

---

## Abstract

I propose a model of time in which the universe has a fixed total entropy budget, partitioned into two forms: **informational entropy** (the space of unrealised possibilities) and **thermodynamic entropy** (the disorder of realised physical configurations). In this view, *time is the process by which informational entropy collapses into certainty*, converting possible states into immutable history. To conserve total entropy, each collapse event reduces informational entropy and forces a corresponding increase in thermodynamic entropy. This provides a unified explanation of (1) why the past appears ordered and fixed, (2) why thermodynamic entropy increases, and (3) why there is a directed arrow of time. Thermodynamic entropy is thus not fundamental, but a bookkeeping shadow of a deeper conservation principle over the space of possibilities.

---

## 1. Introduction

Standard physics treats **thermodynamic entropy** as a measure of disorder, and the **Second Law** as an empirical fact: entropy increases with time.

This raises several long-standing puzzles:

- Why did the universe begin in an extremely low-entropy state?
- Why is the **past** experienced as fixed and ordered, while the **future** appears open and undetermined?
- Why does entropy increase *at all*—what fixes the direction of this increase?

Here I sketch an alternative framing:

> **Time is the conversion of probability into immutability.**

At every "moment", the universe resolves some sliver of possibility into an actual, fixed configuration. The key move is to assume that **the total entropy of the universe is conserved**, but that it exists in two forms: *informational* and *thermodynamic*. The arrow of time emerges as a consequence of converting one into the other.

---

## 2. Two Entropies

Define:

- $S_{\\text{info}}(t)$: **informational entropy** — The entropy of the *future possibility space*—how many ways the universe could still unfold.

- $S_{\\text{therm}}(t)$: **thermodynamic entropy** — The entropy of the *realised physical state*—how many microstates are compatible with the macrostate of the universe.

The central hypothesis:

$$S_{\\text{total}} = S_{\\text{info}}(t) + S_{\\text{therm}}(t) = \\text{constant}$$

The universe begins with an enormous space of possible configurations (high $S_{\\text{info}}$) and minimal realised structure (low $S_{\\text{therm}}$).

---

## 3. Collapse as the Substance of Time

Instead of treating time as a background parameter, we treat **collapse** as the primitive:

> A *collapse event* turns a portion of the possibility space into a fixed, immutable history.

At each such event:

- A set of possible futures converges into **one realised state**.
- That part of the future ceases to be probabilistic and becomes **past**.

In this sense:

- **Past**: fully collapsed, zero informational entropy about "what happened" (it is fixed).
- **Present**: the boundary where collapse occurs.
- **Future**: all remaining unrealised possibilities.

Formally, at each collapse:

$$\\Delta S_{\\text{info}} < 0$$

Informational entropy is **spent**.

---

## 4. Conservation and the Rise of Thermodynamic Entropy

If total entropy is conserved:

$$S_{\\text{total}} = S_{\\text{info}} + S_{\\text{therm}} = \\text{constant}$$

Then any **decrease** in $S_{\\text{info}}$ must be matched by an **increase** in $S_{\\text{therm}}$:

$$\\Delta S_{\\text{therm}} = - \\Delta S_{\\text{info}}$$

This reframes the Second Law:

> **Thermodynamic entropy must increase because informational entropy is collapsing.**

The universe cannot "lose" the entropy associated with unrealised possibilities; instead, when possibilities are removed by collapse, their entropy is *re-expressed* as disorder in the physical configuration of the universe.

Thermodynamic entropy is the **recording cost** of turning possibility into fact.

---

## 5. Shrinking Possibility Space and Increasing Pressure

As more of the universe becomes fixed history, the **volume** of remaining possibility space shrinks:

- Fewer degrees of freedom remain to be decided.
- However, the *total* entropy budget remains constant.
- Therefore, the **density** of informational entropy in the remaining future must **increase**.

Heuristically:

- Initially: vast possibility space, low entropy density.
- Over time: smaller possibility space, higher entropy density ("possibility pressure").

This "pressure" manifests as an increasing tendency toward high-entropy physical configurations: the universe is *forced* into higher thermodynamic entropy states to account for the compressed uncertainty.

---

## 6. The Arrow of Time

This model naturally explains why time has a direction:

1. **Collapse is intrinsically one-way.**
   Once possibilities become facts, they cannot be "un-collapsed"; the past is immutable by definition.

2. **Informational entropy monotonically decreases** as the future possibility space is consumed:

$$\\frac{dS_{\\text{info}}}{dt} \\le 0$$

3. **Thermodynamic entropy monotonically increases** as the physical universe absorbs the cost of collapse:

$$\\frac{dS_{\\text{therm}}}{dt} \\ge 0$$

4. The arrow of time is thus not mysterious: it is simply the direction in which possibility is being converted into certainty.

We experience this arrow subjectively as "the flow of time"; physically we see it as the Second Law.

Both are different views of the same underlying process.

---

## 7. Cosmological Sketch

This perspective offers intuitive answers to several cosmological questions:

- **Why was the early universe low-entropy?**
  Because almost all of the entropy budget was still stored as **informational entropy**; little had yet been crystallised into thermodynamic form.

- **What is "heat death"?**
  Not merely uniform temperature, but a state where **almost all informational entropy has been spent**; almost all possibilities have been collapsed into fixed records, leaving minimal remaining possibility space.

- **What is time?**
  Not a container we move through, but the *ongoing execution* of entropy conversion:

$$\\text{time} \\sim \\text{process}:\\ S_{\\text{info}} \\to S_{\\text{therm}}$$

---

## 8. Visual Metaphor

A useful visual metaphor—and the basis for the 3D visualisation—is:

- A **shrinking volume** representing the future possibility space (informational entropy).
- A **growing "heat" or complexity field** representing thermodynamic entropy.
- A moving **boundary surface** representing the present: the frontier where possibility is converted into fact.

Use the **Visualization** tab to explore this model interactively.

---

## 9. Implications and Open Questions

This model raises several interesting questions for further exploration:

1. **Relationship to quantum mechanics**: Does wavefunction collapse represent the microscopic mechanism of this entropy conversion?

2. **Rate of conversion**: What determines the "speed" of time—the rate at which informational entropy converts to thermodynamic entropy?

3. **Local vs. global**: Is this conversion uniform across spacetime, or can it vary locally?

4. **Reversibility**: If thermodynamic entropy is truly just "stored" informational entropy, could there be conditions under which it converts back?

5. **Consciousness and observation**: Does conscious observation play a special role in the collapse process, or is it purely physical?

---

## Acknowledgments

This model emerged from contemplating the deep connection between information, entropy, and the nature of time. It is offered as a conceptual framework rather than a rigorous physical theory.

`;

export default function Paper() {
  return (
    <div className="paper-container">
      <article className="paper-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {paperContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}
