/* ============================================================
   CCS WEB EXPERIENCE ENGINE — forms
   ------------------------------------------------------------
   Estados de formulário acessíveis e consistentes:
      [data-ccs-form]       forma de agrupar campos + feedback
      [data-ccs-form-status] região de status (aria-live)

   Estados aplicados via classes no <form>:
     .is-loading   enviando (desabilita campos, mostra spinner)
     .is-success   sucesso (feedback positivo)
     .is-error     erro (feedback negativo, foco no primeiro erro)
     .is-disabled  desabilitado (bloqueia envio)

   NÃO inventa backend: o envio real acontece no atributo `action`
   do <form>. Se não houver action, valida no cliente e simula o
   fluxo visual SEM enviar (rótulo claro na doc). O `data-ccs-fake`
   habilita essa simulação explícita para protótipos.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  /* Validação leve no cliente (sem dependência). Retorna array de
     mensagens; vazio = ok. Nunca substitui a validação do servidor. */
  function validateField(input) {
    var errors = [];
    var value = input.value.trim();
    var type = input.getAttribute("type") || "text";

    if (input.required && value === "") {
      errors.push("Este campo é obrigatório.");
    }
    if (value !== "" && type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push("Informe um e-mail válido.");
    }
    if (value !== "" && type === "tel" && !/^[+\d\s()-]{8,20}$/.test(value)) {
      errors.push("Informe um telefone válido.");
    }
    return errors;
  }

  function setStatus(form, msg, kind) {
    var status = form.querySelector("[data-ccs-form-status]");
    if (!status) return;
    status.textContent = msg;
    status.className = "ccs-form-status " + (kind ? "ccs-form-status--" + kind : "");
  }

  function setFieldError(input, errors) {
    var wrap = input.closest(".form-field") || input.parentNode;
    var errEl = wrap.querySelector(".form-field__error");
    input.setAttribute("aria-invalid", errors.length ? "true" : "false");
    if (errors.length) {
      if (errEl) errEl.textContent = errors.join(" ");
      wrap.classList.add("has-error");
    } else {
      wrap.classList.remove("has-error");
    }
  }

  function setup(form) {
    var fake = form.hasAttribute("data-ccs-fake");
    var submit = form.querySelector('[type="submit"]');
    var status = form.querySelector("[data-ccs-form-status]");

    if (status) status.className = "ccs-form-status";

    function disableForm() {
      form.classList.add("is-loading");
      form.querySelectorAll("input, textarea, select, button").forEach(function (el) {
        if (el.disabled) {
          el.setAttribute("data-ccs-was-disabled-already", "");
        } else {
          el.disabled = true;
        }
      });
      if (submit) submit.disabled = true;
    }

    function enableForm() {
      form.classList.remove("is-loading");
      form.querySelectorAll("input, textarea, select, button").forEach(function (el) {
        if (el.hasAttribute("data-ccs-was-disabled-already")) {
          el.removeAttribute("data-ccs-was-disabled-already");
        } else {
          el.disabled = false;
        }
      });
      if (submit) submit.disabled = false;
    }

    form.addEventListener("submit", function (e) {
      var valid = true;
      var firstBad = null;

      form.querySelectorAll("input, textarea, select").forEach(function (input) {
        if (input.type === "checkbox" || input.type === "radio") return;
        var errors = validateField(input);
        setFieldError(input, errors);
        if (errors.length) {
          valid = false;
          if (!firstBad) firstBad = input;
        }
      });

      if (!valid) {
        e.preventDefault();
        setStatus(form, "Confira os campos destacados.", "error");
        form.classList.add("is-error");
        if (firstBad) firstBad.focus();
        return;
      }

      form.classList.remove("is-error");

      /* Sem action real + sem data-ccs-fake: não envia e avisa. */
      if (!form.getAttribute("action") && !fake) {
        e.preventDefault();
        setStatus(form, "Formulário ainda não conectado a um destino real. Configure o atributo action ou data-ccs-fake.", "error");
        return;
      }

      /* Simulação explícita de protótipo (data-ccs-fake) */
      if (fake) {
        e.preventDefault();
        disableForm();
        setStatus(form, "Enviando…", "loading");
        var delay = parseInt(form.getAttribute("data-ccs-delay"), 10) || 900;
        window.setTimeout(function () {
          enableForm();
          form.classList.add("is-success");
          form.reset();
          setStatus(form, "Recebemos sua mensagem. Em breve retornamos.", "success");
        }, delay);
      }
    });

    /* Feedback ao digitar: limpa estado de erro no campo */
    form.addEventListener("input", function (e) {
      if (e.target.matches("input, textarea")) {
        var errors = validateField(e.target);
        setFieldError(e.target, errors);
      }
    });

    /* Botão de novo envio reseta estado de sucesso */
    form.addEventListener("reset", function () {
      form.classList.remove("is-success", "is-error");
      setStatus(form, "", "");
    });
  }

  function init() {
    document.querySelectorAll("form[data-ccs-form]").forEach(setup);
  }

  CCS.forms = { start: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
