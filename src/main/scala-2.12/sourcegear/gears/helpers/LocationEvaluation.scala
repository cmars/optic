package sourcegear.gears.helpers

import optic.parsers.GraphUtils.{AstPrimitiveNode, BaseNode}
import sdk.descriptions.Location

import scalax.collection.edge.LkDiEdge
import scalax.collection.mutable.Graph
import sourcegear.graph.GraphImplicits._
import optic.parsers.types.GraphTypes.AstGraph

object LocationEvaluation {
  def matches(location: Location, node: AstPrimitiveNode, forParent: AstPrimitiveNode = null)(implicit astGraph: AstGraph) : Boolean = {
    import sdk.descriptions.enums.LocationEnums._
    location.in match {
      case Anywhere => true
        //@todo shouldn't be true forever
      case InSameFile => true
      case Sibling => node.siblingOf(forParent)
        //@todo impliment scope. don't reinvent the wheel.
      case InScope => false
      case InParent => node.hasParent(forParent)
      case ChildOf(parent) => node.hasParent(parent.resolved)
      case ParentOf(child) => node.hasChild(child.resolved)
    }

  }
}
