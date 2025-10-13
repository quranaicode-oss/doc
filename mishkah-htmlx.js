'use strict';
/**
 * Mishkah HTMLx micro-templating helper.
 * أداة مساعدة صغيرة لـ Mishkah HTMLx لمعالجة القوالب.
 */
(function (global) {
  const acornLib = global.acorn;
  const walkLib = global.acornWalk || (acornLib && acornLib.walk);

  if (!acornLib || !walkLib || typeof walkLib.simple !== 'function') {
    throw new Error('Secure evaluator requires both acorn and acorn-walk to be loaded.');
  }

  const SIMPLE_WALK = walkLib.simple.bind(walkLib);
  const WALK_BASE = walkLib.base;

  const DISALLOWED_IDENTIFIERS = new Set([
    'window',
    'globalThis',
    'self',
    'document',
    'Function',
    'eval',
    'setTimeout',
    'setInterval',
    'fetch'
  ]);

  const DISALLOWED_NODE_TYPES = new Set([
    'FunctionExpression',
    'ArrowFunctionExpression',
    'FunctionDeclaration',
    'ImportExpression',
    'MetaProperty',
    'NewExpression',
    'UpdateExpression',
    'WithStatement',
    'YieldExpression',
    'AwaitExpression',
    'ThisExpression',
    'Super'
  ]);

  function ensureSafeAst(ast) {
    SIMPLE_WALK(
      ast,
      {
        Identifier(node) {
          if (DISALLOWED_IDENTIFIERS.has(node.name)) {
            throw new Error('Identifier "' + node.name + '" is not allowed inside Mishkah HTMLx expressions.');
          }
        },
        MemberExpression(node) {
          if (node.object && node.object.type === 'Identifier' && DISALLOWED_IDENTIFIERS.has(node.object.name)) {
            throw new Error('Accessing "' + node.object.name + '" is not permitted inside Mishkah HTMLx expressions.');
          }
        },
        CallExpression(node) {
          if (node.callee.type === 'Identifier' && DISALLOWED_IDENTIFIERS.has(node.callee.name)) {
            throw new Error('Calling "' + node.callee.name + '" is not permitted.');
          }
          if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && DISALLOWED_IDENTIFIERS.has(node.callee.object.name)) {
            throw new Error('Calling methods on "' + node.callee.object.name + '" is not permitted.');
          }
        }
      },
      WALK_BASE
    );

    SIMPLE_WALK(
      ast,
      DISALLOWED_NODE_TYPES.reduce(function (visitors, type) {
        visitors[type] = function () {
          throw new Error('The syntax "' + type + '" is not permitted in Mishkah HTMLx expressions.');
        };
        return visitors;
      }, {}),
      WALK_BASE
    );
  }

  function evaluateExpression(expression, context) {
    var trimmed = expression.trim();
    if (!trimmed) {
      return '';
    }

    var ast;
    try {
      ast = acornLib.parse(trimmed, { ecmaVersion: 'latest' });
    } catch (parseError) {
      throw new Error('Unable to parse Mishkah HTMLx expression: ' + parseError.message);
    }

    ensureSafeAst(ast);

    var argNames = Object.keys(context || {});
    var argValues = argNames.map(function (key) {
      return context[key];
    });

    try {
      // eslint-disable-next-line no-new-func
      var evaluator = Function.apply(null, argNames.concat('"use strict"; return (' + trimmed + ');'));
      return evaluator.apply(null, argValues);
    } catch (runtimeError) {
      throw new Error('Error while evaluating Mishkah HTMLx expression: ' + runtimeError.message);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var TRIPLE_BRACE = /\{\{\{([\s\S]+?)\}\}\}/g;
  var DOUBLE_BRACE = /\{\{([^{}]+)\}\}/g;

  function render(templateString, context) {
    if (typeof templateString !== 'string') {
      throw new TypeError('Template must be a string.');
    }

    var intermediate = templateString.replace(TRIPLE_BRACE, function (_, rawExpression) {
      var value = evaluateExpression(rawExpression, context);
      return value === undefined || value === null ? '' : String(value);
    });

    return intermediate.replace(DOUBLE_BRACE, function (_, rawExpression) {
      var value = evaluateExpression(rawExpression, context);
      if (value === undefined || value === null) {
        return '';
      }
      return escapeHtml(value);
    });
  }

  function getTemplateContent(templateRef) {
    if (typeof templateRef === 'string') {
      var templateElement = document.getElementById(templateRef);
      if (!templateElement) {
        throw new Error('Template with id "' + templateRef + '" was not found.');
      }
      return templateElement.innerHTML;
    }

    if (templateRef && typeof templateRef.innerHTML === 'string') {
      return templateRef.innerHTML;
    }

    throw new Error('Unsupported template reference: provide a template id or element.');
  }

  function resolveTarget(target) {
    if (typeof target === 'string') {
      var element = document.querySelector(target);
      if (!element) {
        throw new Error('Target element "' + target + '" was not found in the document.');
      }
      return element;
    }

    if (target && typeof target.innerHTML !== 'undefined') {
      return target;
    }

    throw new Error('Unsupported target reference: provide a selector or element.');
  }

  function mount(templateRef, targetRef, context) {
    var templateString = getTemplateContent(templateRef);
    var targetElement = resolveTarget(targetRef);
    var html = render(templateString, context || {});
    targetElement.innerHTML = html;
    return targetElement;
  }

  function createRenderer(templateRef, targetRef) {
    return function (context) {
      return mount(templateRef, targetRef, context);
    };
  }

  global.MishkahHTMLx = {
    version: '1.0.0',
    render: render,
    mount: mount,
    createRenderer: createRenderer,
    evaluate: evaluateExpression,
    escape: escapeHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
