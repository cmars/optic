package sdk.descriptions.enums

import play.api.libs.json.{JsError, _}
import sdk.descriptions.Finders.Finder
import sdk.descriptions.helpers.{CodeLocation, FinderLocation}

import scala.util.Try

object LocationEnums {

  sealed trait LocationTypeEnums

  case object InSameFile extends LocationTypeEnums
  case object Anywhere extends LocationTypeEnums
  case object SameParent extends LocationTypeEnums
  case object InScope extends LocationTypeEnums

  case class ChildOf(location: CodeLocation) extends LocationTypeEnums
  case class ParentOf(location: CodeLocation) extends LocationTypeEnums

  implicit val childOfReads = new Reads[ChildOf] {
    override def reads(json: JsValue): JsResult[ChildOf] = {
      val location = (json.as[JsObject] \ "location").get
      val finder = Finder.fromJson(location)
      JsSuccess(ChildOf(FinderLocation(finder)))
    }
  }

  implicit val parentOfReads = new Reads[ParentOf] {
    override def reads(json: JsValue): JsResult[ParentOf] = {
      val location = (json.as[JsObject] \ "location").get
      val finder = Finder.fromJson(location)
      JsSuccess(ParentOf(FinderLocation(finder)))
    }
  }

  implicit val locationTypesReads: Reads[LocationTypeEnums] = new Reads[LocationTypeEnums] {
    override def reads(json: JsValue): JsResult[LocationTypeEnums] = {
      val typeOption = Try(json.as[JsString].value)
      if (typeOption.isFailure) throw new Error(json + " is not a valid location") else typeOption.get match {
        case "InSameFile" => JsSuccess(InSameFile)
        case "Anywhere" => JsSuccess(Anywhere)
        case "SameParent" => JsSuccess(SameParent)
        case "InScope" => JsSuccess(InScope)
        case "ChildOf" => Json.fromJson[ChildOf](json)
        case "ParentOf" => Json.fromJson[ParentOf](json)
        case _ => JsError(json+" is not a valid option. Must be one of [InSameFile, Anywhere, SameParent, InScope]")
      }
    }
  }

}
