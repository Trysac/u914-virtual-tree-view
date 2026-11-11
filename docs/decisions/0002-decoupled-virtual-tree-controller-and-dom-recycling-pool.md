# Decoupled Virtual Tree Controller and DOM Recycling Pool

Status: accepted (generated, pending human review)

## Context

Traditional DOM trees render thousands of nested elements, freezing browsers and confusing screen readers with deeply nested accessibility trees. Simple virtualized lists lose hierarchical context such as level and sibling positions.

## Decision

Implement an iterative pre-order indexed TreeController that computes flat ARIA attributes (aria-level, aria-setsize, aria-posinset) and maintains a pool of recycled DOM row elements positioned with translateY and managed via aria-activedescendant.

## Consequences

Maintains constant DOM footprint (<= 35 elements for a 600px viewport) regardless of tree depth or node count, guaranteeing 60 fps performance with complete WAI-ARIA APG compliance.
