The original repo contains a patch object and JS/CSS fixes targeted at docs/jacob_plan_preview.html. Include these adapter patch notes here so you have the context and can re-apply or integrate them into any adapter code.

Excerpt (copy into a proper adapter in the new repo if you need runtime behavior):
- Path: docs/jacob_plan_preview.html
- Description: Fix card flip & modal overlap: clip backface, remove duplicate listeners, attach expand handler synchronously, ensure stable IDs for shopping items.

Patch suggestions (JS/CSS changes excerpted from tg_adapters.py):
CSS to add:
.meal-card .card-back{overflow:hidden;pointer-events:auto;z-index:100000;}
.meal-card .card-inner{transform-style:preserve-3d;-webkit-transform-style:preserve-3d;}

JS changes (examples of finds/replaces):
- find: "setTimeout(()=>{"
  replace: attach expand handler immediately, e.g.
    const btn = mcard.querySelector('.expand-btn');
    if(btn) btn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openRecipeModal({title:o.name, recipe:generateSimpleRecipe(o), notes:o.notes, ingredients}); });

- find duplicate click listeners and remove duplicates so only one flip handler remains:
  mcard.addEventListener('click', (ev)=>{ if(ev.target.closest('.expand-btn')) return; try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){} mcard.classList.toggle('flipped'); });

See the full context in the original tg_adapters.py file if you need to copy more logic.
