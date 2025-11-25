import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const paperContent = `
# Time as Entropy Conversion
## A Dual-Entropy Model of the Arrow of Time

---

## Abstract

I propose a model of time in which the universe has a fixed total entropy budget, partitioned into two forms: **informational entropy** (the space of unrealised possibilities) and **thermodynamic entropy** (the disorder of realised physical configurations). Time is modelled as the ongoing **conversion of informational entropy into thermodynamic entropy**, occurring at the boundary we perceive as the present. Each collapse event reduces the future's informational entropy and forces an equal increase in thermodynamic entropy, conserving the total. This framework resolves the entropy paradox, explains the arrow of time, and aligns naturally with computational interpretations of physical law, including—but not requiring—simulation-theoretic perspectives.

---

## 1. Introduction

Physics describes the Second Law of Thermodynamics as an empirical fact: **entropy increases with time**. But this leads to profound conceptual puzzles:

- Why did the universe begin in a low-entropy state?
- Why is the past fixed and orderly, while the future is open and uncertain?
- What determines the direction of time's arrow?

This paper suggests a reframing:

> **Time is the process by which the universe converts probability into immutability.**

This leads naturally to a dual-entropy model.

---

## 2. Two Entropies

Define:

- $S_{\\text{info}}(t)$: **informational entropy** — entropy of unrealised future possibilities.

- $S_{\\text{therm}}(t)$: **thermodynamic entropy** — entropy of the realised physical universe.

Assume:

$$S_{\\text{total}} = S_{\\text{info}}(t) + S_{\\text{therm}}(t) = \\text{constant}$$

This assumption aligns with the holographic bound and several modern formulations in quantum information theory.

---

## 3. Collapse as the Substance of Time

The "present" is the boundary where many possible futures collapse into one actual world-line. This collapse reduces informational entropy:

$$\\Delta S_{\\text{info}} < 0$$

The past grows; the future contracts.

At each collapse event:

- A set of possible futures converges into **one realised state**.
- That part of the future ceases to be probabilistic and becomes **past**.

In this sense:

- **Past**: fully collapsed, zero informational entropy about "what happened" (it is fixed).
- **Present**: the boundary where collapse occurs.
- **Future**: all remaining unrealised possibilities.

Informational entropy is **spent**.

---

## 4. Conservation and the Rise of Thermodynamic Entropy

Given conservation:

$$\\Delta S_{\\text{therm}} = -\\Delta S_{\\text{info}} > 0$$

Thus:

> **Thermodynamic entropy increases because informational entropy is being lost due to collapse.**

The universe cannot "lose" the entropy associated with unrealised possibilities; instead, when possibilities are removed by collapse, their entropy is *re-expressed* as disorder in the physical configuration of the universe.

The Second Law becomes a manifestation of informational entropy conversion.

---

## 5. Shrinking Future, Increasing Density

As collapse continues:

- The volume of the future possibility space decreases
- But the total informational entropy budget is fixed
- So informational entropy becomes more densely packed

Thermodynamic entropy rises because the universe must store the "cost" of collapse.

This "pressure" manifests as an increasing tendency toward high-entropy physical configurations: the universe is *forced* into higher thermodynamic entropy states to account for the compressed uncertainty.

---

## 6. The Arrow of Time

Collapse is irreversible. Thus thermodynamic entropy inherits the direction of informational entropy loss.

1. **Collapse is intrinsically one-way.**
   Once possibilities become facts, they cannot be "un-collapsed"; the past is immutable by definition.

2. **Informational entropy monotonically decreases** as the future possibility space is consumed:

$$\\frac{dS_{\\text{info}}}{dt} \\le 0$$

3. **Thermodynamic entropy monotonically increases** as the physical universe absorbs the cost of collapse:

$$\\frac{dS_{\\text{therm}}}{dt} \\ge 0$$

Time flows from high uncertainty to fully committed certainty.

---

## 7. Cosmological Implications

This perspective offers intuitive answers to several cosmological questions:

- **Early universe** = maximal informational entropy, minimal physical entropy
- **Heat death** = exhaustion of informational entropy; almost all possibilities have been collapsed into fixed records
- **Cosmic acceleration** may be interpretable as informational pressure

---

## 8. Visual Model

A 3D model can represent:

- **Past** = crystallised region (orange particles, frozen in place)
- **Present** = glowing conversion boundary (the "NOW" surface)
- **Future** = shrinking, intensifying informational field (blue particles, increasingly excited)

Use the **Visualization** tab to explore this model interactively.

---

## 9. Computation as Entropy Conversion

A striking realisation emerges when we consider what a **CPU** does:

> A CPU is a physical implementation of "NOW"—a machine that converts informational entropy into thermodynamic entropy.

Consider the instruction pipeline:

- **Pending instructions** represent *informational entropy*: possibilities that have not yet been realised. The program *could* branch many ways; the data *could* take many values.

- **The execution unit** is the **present moment**: the point where possibility collapses into actuality. One specific instruction executes. One specific state is written.

- **Executed instructions** become *immutable history*: the past states of the machine, now fixed.

- **Heat dissipation** is the thermodynamic cost: the entropy that must be released into the environment as possibilities collapse into facts.

This is not merely an analogy—it is the *same process* operating at different scales:

$$\\text{CPU} \\equiv \\text{NOW}:\\quad S_{\\text{info}}^{\\text{instructions}} \\to S_{\\text{therm}}^{\\text{heat}}$$

Landauer's principle already tells us that erasing information has a minimum thermodynamic cost ($kT \\ln 2$ per bit). Our model suggests this is a specific instance of a universal principle: **all computation is entropy conversion**, and **all entropy conversion is a form of time**.

---

## 10. Simulation-Theoretic Interpretation

Although this model does not assert the universe is a simulation, it reveals a computational structure underlying physical reality. Several features align naturally with familiar concepts from computation:

### (A) The Present as an Execution Boundary

In this model the present is the "entropy converter": the boundary where many possible futures collapse into one realised state. This resembles the *execution step* in computational systems, where a processor selects one branch of many potential code paths and commits the next state.

If the universe were a computation, the present moment would correspond to the "tick" or "cycle" where state updates occur.

### (B) Finite Informational Entropy = Finite State Space

The assumption that the universe contains a fixed total entropy budget mirrors the finite-state constraint of any computable system. A universe with a finite Hilbert space, finite informational entropy, or holographic bound is structurally equivalent to a simulable system.

This does not prove simulation; it shows **structural compatibility**.

### (C) Collapse as Branch Resolution

Quantum collapse in this model plays the same functional role as branch prediction resolution in a CPU: many potential future states reduce to one committed path. The reduction of informational entropy mirrors the reduction of computational branching entropy.

### (D) Thermodynamic Entropy as State-Update Cost

When informational entropy decreases, thermodynamic entropy must rise. In computation, irreversible state updates incur unavoidable entropy costs (Landauer's principle).

The universe's increasing thermodynamic entropy can therefore be interpreted as:

> A physical manifestation of the cost of committing new states as informational possibilities collapse.

This is precisely what happens in simulated systems: writing to memory incurs entropy/energy cost.

### (E) An Interpretation Without Metaphysical Commitment

The alignment between the entropy-conversion model and computational architectures does not imply a conscious designer, digital substrate, or "simulation" in the science-fiction sense.

It may instead indicate:

- Computation is the fundamental structure of physical law
- Physical law and computability are equivalent descriptions
- Reality behaves computationally by necessity, not design

This perspective is consonant with Wheeler's "It from Bit," the holographic principle, and quantum information theory.

### (F) A Minimal Simulation Hypothesis

This model suggests a weaker and more philosophically grounded simulation hypothesis:

> **Regardless of whether our universe is *simulated*, it behaves as if its evolution is a computation converting informational entropy into thermodynamic entropy.**

In this view, "simulation" is not an ontological claim but a structural one: **reality has the architecture of a computation.**

---

## 11. Conclusion

By reframing time as the irreversible conversion of informational entropy into thermodynamic entropy, we obtain a unified explanation for the arrow of time, the increasing disorder of the universe, the apparent low entropy of the early cosmos, and the structure of quantum collapse.

This framework also naturally exhibits computational characteristics. Whether or not the universe is literally a simulation, it behaves as a system performing continuous state updates under a conservation constraint.

The present moment can thus be understood as the universe's "execution engine": a boundary that selects outcomes, commits history, and redistributes entropy to maintain global invariants.

This view does not prove simulation theory, but it demonstrates that the underlying architecture of physical reality is computational in form—a possibility increasingly supported by modern theoretical physics.

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
