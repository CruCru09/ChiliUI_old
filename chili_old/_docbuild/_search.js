(function () {
  var INDEX = __INDEX_JSON__;
  var L = __L10N_JSON__;
  var inp = document.getElementById('search');
  var box = document.getElementById('results');
  var navEl = document.getElementById('nav');
  var navLinks = [].slice.call(document.querySelectorAll('#nav a[data-t]'));
  var OFFSET = 74;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }

  function mark(text, tokens) {
    var s = String(text == null ? '' : text);
    if (!tokens.length) return esc(s);
    var low = s.toLowerCase(), cuts = [];
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      if (!tok) continue;
      var i = low.indexOf(tok);
      while (i >= 0) { cuts.push([i, i + tok.length]); i = low.indexOf(tok, i + 1); }
    }
    if (!cuts.length) return esc(s);
    cuts.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [cuts[0]];
    for (var k = 1; k < cuts.length; k++) {
      var p = merged[merged.length - 1], c = cuts[k];
      if (c[0] <= p[1]) p[1] = Math.max(p[1], c[1]); else merged.push(c);
    }
    var out = '', pos = 0;
    for (var m = 0; m < merged.length; m++) {
      out += esc(s.slice(pos, merged[m][0])) + '<mark>' + esc(s.slice(merged[m][0], merged[m][1])) + '</mark>';
      pos = merged[m][1];
    }
    return out + esc(s.slice(pos));
  }

  var MAX = 80;
  function search(q) {
    var tokens = q.split(/\s+/).filter(Boolean);
    var hits = [];
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      var name = lower(e.n), where = lower(e.w), desc = lower(e.d), kind = lower(e.k);
      var hay = name + ' ' + where + ' ' + desc + ' ' + kind;
      var ok = true;
      for (var t = 0; t < tokens.length; t++) { if (hay.indexOf(tokens[t]) < 0) { ok = false; break; } }
      if (!ok) continue;
      var first = tokens[0], score = 60;
      if (name === q) score = 0;
      else if (name.indexOf(q) === 0) score = 1;
      else if (name.indexOf(first) === 0) score = 2;
      else if (name.indexOf(first) >= 0) score = 3;
      else if (where.indexOf(first) >= 0) score = 4;
      else if (desc.indexOf(first) >= 0) score = 5;
      hits.push({ s: score * 100 + (e.r == null ? 9 : e.r), n: e.n, e: e });
    }
    hits.sort(function (a, b) {
      return a.s - b.s || a.n.length - b.n.length || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0);
    });
    return hits;
  }

  var cur = [], sel = -1;
  function render(q) {
    var tokens = q.split(/\s+/).filter(Boolean);
    cur = q ? search(q) : [];
    sel = -1;
    if (!q) { box.className = ''; box.innerHTML = ''; return; }
    if (!cur.length) {
      box.innerHTML = '<div class="r-empty">' + esc(L.empty) + '</div>';
      box.className = 'on';
      return;
    }
    var html = '';
    var n = Math.min(cur.length, MAX);
    for (var j = 0; j < n; j++) {
      var e = cur[j].e;
      html += '<a href="#' + e.a + '" data-i="' + j + '">'
        + '<span class="r-kind">' + esc(e.k) + '</span>'
        + '<span class="r-nm">' + mark(e.n, tokens) + '</span>'
        + '<span class="r-where">' + mark(e.w, tokens) + '</span>'
        + (e.d ? '<span class="r-desc">' + mark(e.d, tokens) + '</span>' : '')
        + '</a>';
    }
    if (cur.length > MAX) html += '<div class="r-more">' + esc(L.morePre) + cur.length + esc(L.morePost) + '</div>';
    html += '<div class="r-foot">' + esc(L.footPre) + ' ' + cur.length + ' ' + esc(L.footSuf) + '</div>';
    box.innerHTML = html;
    box.className = 'on';
  }

  function setSel(n) {
    var as = box.querySelectorAll('a[data-i]');
    if (!as.length) return;
    if (sel >= 0 && as[sel]) as[sel].classList.remove('sel');
    sel = Math.max(0, Math.min(as.length - 1, n));
    as[sel].classList.add('sel');
    if (as[sel].scrollIntoView) as[sel].scrollIntoView({ block: 'nearest' });
  }
  function close() { box.className = ''; box.innerHTML = ''; sel = -1; }

  function openAncestors(el) {
    var p = el;
    while (p && p.tagName) { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
  }
  function flashOnly(el) {
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 1600);
  }
  function setHash(id) {
    if (history.replaceState) { try { history.replaceState(null, '', '#' + id); } catch (e) { } }
  }
  // on-load hash: browsers already did the native jump (scroll-margin-top handles the fixed bar).
  // We only make sure the target is not hidden inside a closed <details>, then nudge if needed - no smooth scrolling.
  function align(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    openAncestors(el);
    var y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0) - OFFSET;
    if (Math.abs(y - (window.pageYOffset || document.documentElement.scrollTop || 0)) > 8) {
      try { window.scrollTo(0, Math.max(0, y)); } catch (e) { }
    }
    flashOnly(el);
    return true;
  }
  function go(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    openAncestors(el);
    var scrollToEl = function () {
      var y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0) - OFFSET;
      if (window.scrollTo) { try { window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } catch (e) { window.scrollTo(0, Math.max(0, y)); } }
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(scrollToEl); else setTimeout(scrollToEl, 0);
    flashOnly(el);
    setHash(id);
    return true;
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var cp = t.closest('button.copy');
    if (cp) {
      var sig = cp.getAttribute('data-sig') || '';
      var done = function () { var old = cp.textContent; cp.textContent = L.copied; setTimeout(function () { cp.textContent = old; }, 1100); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(sig).then(done, done); }
      else {
        var ta = document.createElement('textarea');
        ta.value = sig; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); done();
      }
      return;
    }
    var a = t.closest('a[href^="#"]');
    if (a) {
      var href = a.getAttribute('href');
      var id = href ? href.slice(1) : '';
      if (id && go(id)) { ev.preventDefault(); close(); }
      return;
    }
    if (!t.closest('.searchbox')) close();
  });

  function spy() {
    ticking = false;
    var best = null, bestTop = -1e9;
    for (var i = 0; i < targets.length; i++) {
      var r = targets[i].el.getBoundingClientRect();
      if (r.top - OFFSET <= 12 && r.top > bestTop) { bestTop = r.top; best = targets[i]; }
    }
    if (!best && targets.length) best = targets[0];
    for (var k = 0; k < navLinks.length; k++) navLinks[k].classList.remove('active');
    if (best) {
      best.a.classList.add('active');
      if (navEl && best.a.scrollIntoView) {
        var nr = navEl.getBoundingClientRect(), ar = best.a.getBoundingClientRect();
        if (ar.top < nr.top + 40 || ar.bottom > nr.bottom - 40) best.a.scrollIntoView({ block: 'nearest' });
      }
    }
  }
  var ticking = false;
  var targets = navLinks.map(function (a) { return { a: a, el: document.getElementById(a.getAttribute('data-t')) }; }).filter(function (x) { return !!x.el; });
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();

  inp.addEventListener('input', function () { render(inp.value.trim().toLowerCase()); });
  inp.addEventListener('focus', function () { if (inp.value.trim()) render(inp.value.trim().toLowerCase()); });
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { inp.value = ''; close(); inp.blur(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel(sel < 0 ? 0 : sel + 1); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel(sel < 0 ? 0 : sel - 1); return; }
    if (ev.key === 'Enter') {
      var as = box.querySelectorAll('a[data-i]');
      var a = as[sel >= 0 ? sel : 0];
      if (a) { var id = (a.getAttribute('href') || '').slice(1); if (go(id)) { inp.value = ''; close(); } }
    }
  });

  var bt = document.getElementById('backtop');
  window.addEventListener('scroll', function () {
    if (window.pageYOffset > 600) bt.classList.add('on'); else bt.classList.remove('on');
  }, { passive: true });
  bt.addEventListener('click', function () {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  });

  document.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); inp.focus(); inp.select(); return; }
    var tag = (ev.target && ev.target.tagName) || '';
    if (ev.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { ev.preventDefault(); inp.focus(); inp.select(); }
  });

  if (location.hash.length > 1) {
    setTimeout(function () { align(location.hash.slice(1)); }, 120);
  }
})();
