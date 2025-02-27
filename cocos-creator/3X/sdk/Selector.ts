import type AbstractDumper from "./AbstractDumper"
import type DefaultMatcher from "./DefaultMatcher"
import type AbstractNode from "./AbstractNode"

export default class Selector {
    dumper: AbstractDumper
    matcher: DefaultMatcher
    constructor(dumper: AbstractDumper, matcher: DefaultMatcher) {
        this.dumper = dumper
        this.matcher = matcher
    }

    getRoot() {
        return this.dumper.getRoot()
    }

    select(cond: any, multiple: boolean) {
        return this.selectImpl(cond, multiple, this.getRoot(), 9999, true, true)
    }

    selectImpl(
        cond: any,
        multiple: boolean,
        root: AbstractNode,
        maxDepth: number,
        onlyVisibleNode: boolean,
        includeRoot: boolean
    ) {
        // 凡是visible为false后者parentVisible为false的都不选
        var result: any[] = []
        if (!root) {
            return result
        }

        var op = cond[0]
        var args = cond[1]

        if (op === ">" || op === "/") {
            var parents = [root]
            for (var index in args) {
                const i = parseInt(index)
                var arg = args[i]
                var midResult: any[] = []
                for (var j in parents) {
                    var parent = parents[j]
                    var _maxDepth = maxDepth
                    if (op === "/" && i !== 0) {
                        _maxDepth = 1
                    }
                    var _res = this.selectImpl(
                        arg,
                        true,
                        parent,
                        _maxDepth,
                        onlyVisibleNode,
                        false
                    )
                    for (var k in _res) {
                        if (midResult.indexOf(_res[k]) < 0) {
                            midResult.push(_res[k])
                        }
                    }
                }
                parents = midResult
            }
            result = parents
        } else if (op === "-") {
            var query1 = args[0]
            var query2 = args[1]
            var result1 = this.selectImpl(
                query1,
                multiple,
                root,
                maxDepth,
                onlyVisibleNode,
                includeRoot
            )
            for (var index in result1) {
                var n = result1[index]
                var sibling_result = this.selectImpl(
                    query2,
                    multiple,
                    n.getParent(),
                    1,
                    onlyVisibleNode,
                    includeRoot
                )
                for (var k in sibling_result) {
                    if (result.indexOf(sibling_result[k]) < 0) {
                        result.push(sibling_result[k])
                    }
                }
            }
        } else if (op === "index") {
            var cond = args[0]
            var i = args[1]
            result = [
                this.selectImpl(
                    cond,
                    multiple,
                    root,
                    maxDepth,
                    onlyVisibleNode,
                    includeRoot
                )[i],
            ]
        } else if (op === "^") {
            // parent
            // only select parent of the first matched UI element
            var query1 = args[0]
            var result1 = this.selectImpl(
                query1,
                false,
                root,
                maxDepth,
                onlyVisibleNode,
                includeRoot
            )
            if (result1.length > 0) {
                var parent_node = result1[0].getParent()
                if (parent_node) {
                    result = [parent_node]
                }
            }
        } else {
            this._selectTraverse(
                cond,
                root,
                result,
                multiple,
                maxDepth,
                onlyVisibleNode,
                includeRoot
            )
        }
        return result
    }

    _selectTraverse(
        cond: any,
        node: AbstractNode,
        outResult: any[],
        multiple: boolean,
        maxDepth: number,
        onlyVisibleNode: boolean,
        includeRoot: boolean
    ) {
        // 剪掉不可见节点branch
        if (onlyVisibleNode && !node.getAttr("visible")) {
            return false
        }

        if (this.matcher.match(cond, node)) {
            // 父子/祖先后代节点选择时，默认是不包含父节点/祖先节点的
            // 在下面的children循环中则需要包含，因为每个child在_selectTraverse中就当做是root
            if (includeRoot) {
                if (outResult.indexOf(node) < 0) {
                    outResult.push(node)
                }
                if (!multiple) {
                    return true
                }
            }
        }

        // 最大搜索深度耗尽并不表示遍历结束，其余child节点仍需遍历
        if (maxDepth === 0) {
            return false
        }
        maxDepth -= 1

        var children = node.getChildren()
        for (var i in node.getChildren()) {
            var child = children[i]
            var finished = this._selectTraverse(
                cond,
                child,
                outResult,
                multiple,
                maxDepth,
                onlyVisibleNode,
                true
            )
            if (finished) {
                return true
            }
        }

        return false
    }
}
