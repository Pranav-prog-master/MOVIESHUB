// XP Movies — global client helpers

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  try { localStorage.setItem('xp-theme', name); } catch (e) {}
  syncThemeUI(name);
}

function syncThemeUI(name) {
  var list = document.getElementById('theme-list');
  if (!list) return;
  list.querySelectorAll('button[data-theme-id]').forEach(function (btn) {
    btn.classList.toggle('theme-row--active', btn.dataset.themeId === name);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  // Sync theme picker highlight on settings page
  var saved = (function () { try { return localStorage.getItem('xp-theme') || 'dark'; } catch (e) { return 'dark'; } })();
  syncThemeUI(saved);

  // Search suggestions
  var input = document.getElementById('search-input');
  var box   = document.getElementById('search-suggestions');
  if (input && box) {
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      var q = input.value.trim();
      if (q.length < 2) { box.classList.add('hidden'); box.innerHTML = ''; return; }
      t = setTimeout(function () {
        fetch('/api/suggest?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var items = (data.results || []).map(function (m) {
              return '<a href="/movie/' + m.slug + '" class="block px-4 py-2 text-sm transition-colors" style="color:var(--text)" onmouseover="this.style.background=\'var(--panel-hover)\'" onmouseout="this.style.background=\'transparent\'">' +
                m.title + (m.releaseYear ? ' <span style="color:var(--muted)">(' + m.releaseYear + ')</span>' : '') + '</a>';
            });
            box.innerHTML = items.length ? items.join('') : '';
            box.classList.toggle('hidden', items.length === 0);
          })
          .catch(function () { box.classList.add('hidden'); });
      }, 200);
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.classList.add('hidden');
    });
  }
});
