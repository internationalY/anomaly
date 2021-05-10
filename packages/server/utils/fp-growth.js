var Combinatorics = require('js-combinatorics');

function FPNode(value, count, parent) {
  this.value = value;
  this.count = count;
  this.parent = parent;
  this.link = null;
  this.children = [];
}

FPNode.prototype.hasChild = function(value) {
  for (let i = 0, j = this.children.length; i < j; ++i) {
    const child = this.children[i];
    if (child.value == value) return true;
  }
  return false;
};

FPNode.prototype.getChild = function(value) {
  const index = this.children.findIndex(i => i.value == value);
  return index === -1 ? null : this.children[index];
};

FPNode.prototype.addChild = function(value) {
  const child = new FPNode(value, 1, this);
  this.children.push(child);
  return child;
};

function FPTree(transactions, threshold, rootValue, rootCount) {
  // frequent === { 'id': count }
  this.frequent = this.findFrequentItems(transactions, threshold);
  this.headers = this.buildHeaderTable(this.frequent);
  this.root = this.buildFPTree(transactions, rootValue, rootCount, this.frequent, this.headers);
}

FPTree.prototype.findFrequentItems = function(transactions, threshold) {
  const items = {};
  transactions.forEach(t => {
    t.forEach(item => {
      if (items[item] == null) items[item] = 1;
      else items[item] += 1;
    });
  });
  Object.keys(items).forEach(key => {
    if (items[key] < threshold) delete items[key];
  });
  return items;
};

FPTree.prototype.buildHeaderTable = function(frequent) {
  const headers = {};
  Object.keys(frequent).forEach(key => (headers[key] = null));
  return headers;
};

FPTree.prototype.buildFPTree = function(transactions, rootValue, rootCount, frequent, headers) {
  const root = new FPNode(rootValue, rootCount, null);
  transactions.forEach(t => {
    const sortedItems = t.filter(c => frequent[c] != null);
    sortedItems.sort((a, b) => frequent[b] - frequent[a]);
    if (sortedItems.length > 0) this.insertTree(sortedItems, root, headers);
  });
  return root;
};

FPTree.prototype.insertTree = function(items, node, headers) {
  const first = items[0];
  let child = node.getChild(first);
  if (child != null) child.value += 1;
  else {
    child = node.addChild(first);
    if (headers[first] == null) headers[first] = child;
    else {
      let current = headers[first];
      while (current.link != null) current = current.link;
      current.link = child;
    }
  }
  const restItems = items.slice(1);
  if (restItems.length > 0) this.insertTree(restItems, child, headers);
};

FPTree.prototype.hasSinglePath = function(node) {
  const len = node.children == null ? 0 : node.children.length;
  if (len > 1) return false;
  else if (len === 0) return true;
  else return true && this.hasSinglePath(node.children[0]);
};

FPTree.prototype.minePatterns = function(threshold) {
  if (this.hasSinglePath(this.root)) return this.generatePatternList();
  else return this.zipPatterns(this.mineSubTrees(threshold));
};

FPTree.prototype.zipPatterns = function(patterns) {
  const suffix = this.root.value;
  if (suffix != null) {
    const newPatterns = new Map();
    Object.keys(patterns).forEach(key => {
      const k = [...key, suffix].sort();
      newPatterns.set(k, patterns.get(key));
    });
    return newPatterns;
  }
  return patterns;
};

FPTree.prototype.generatePatternList = function() {
  const patterns = new Map();
  let suffixValue = [];
  const items = Object.keys(this.frequent);
  if (this.root.value == null) suffixValue = [];
  else {
    suffixValue = [this.root.value];
    patterns.set(suffixValue, this.root.count);
  }
  for (let i = 1, j = items.length; i <= j; ++i) {
    const subsets = Combinatorics.combination(items, i);
    subsets.forEach(s => {
      const patternKey = [...s, ...suffixValue].sort();
      let minValue = Number.MAX_SAFE_INTEGER;
      s.forEach(s => {
        if (this.frequent[s] < minValue) minValue = this.frequent[s];
      });
      patterns.set(patternKey, minValue);
    });
  }
  return patterns;
};

FPTree.prototype.mineSubTrees = function(threshold) {
  const patterns = new Map();
  const miningOrder = Object.keys(this.frequent).sort((a, b) => this.frequent[a] - this.frequent[b]);
  miningOrder.forEach(item => {
    const suffixes = [];
    const conditionalTreeInput = [];
    let node = this.headers[item];
    while (node != null) {
      suffixes.push(node);
      node = node.link;
    }
    suffixes.forEach(s => {
      const frequency = s.count;
      const path = [];
      let parent = s.parent;
      while (parent.parent != null) {
        path.push(parent.value);
        parent = parent.parent;
      }
      for (let i = 0; i < frequency; ++i) conditionalTreeInput.push(path);
    });
    const subtree = new FPTree(conditionalTreeInput, threshold, item, this.frequent[item]);
    const subtreePattern = subtree.minePatterns(threshold);
    Object.keys(subtreePattern).forEach(key => {
      if (patterns.has(key)) {
        patterns.set(key, patterns.get(key) + subtreePattern.get(key));
      } else {
        patterns.set(subtreePattern.get(key));
      }
    });
  });
  return patterns;
};

function findFrequentPatterns(transactions, supportThreshold) {
  const tree = new FPTree(transactions, supportThreshold, null, null);
  return tree.minePatterns(supportThreshold);
}

function generateAssociationRules(patterns, confidenceThreshold) {
  const rules = new Map();
  Object.keys(patterns).forEach(itemset => {
    const upperSupport = patterns.get(itemset);
    for (let i = 1; i <= itemset.length; ++i) {
      const antecedent = Combinatorics.combination(itemset, i);
      antecedent.forEach(a => {
        const ante = a.sort().slice(0);
        const anteSet = new Set(ante);
        const consequent = new Set(itemset).filter(item => anteSet.has(item) === false);
        if (patterns.has(ante) === true) {
          const lowerSupport = patterns.get(ante);
          const confidence = Number.parseFloat(upperSupport / lowerSupport).toFixed(5);
          if (confidence >= confidenceThreshold) rules.set(ante, [consequent, confidence]);
        }
      });
    }
  });
  return rules;
}

module.exports = {
  findFrequentPatterns,
  generateAssociationRules
};
