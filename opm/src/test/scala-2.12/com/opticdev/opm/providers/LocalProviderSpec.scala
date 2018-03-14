package com.opticdev.opm.providers

import better.files.File
import com.opticdev.common.PackageRef
import org.scalatest.FunSpec

import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

class LocalProviderSpec extends FunSpec {

  implicit val projectKnowledgeSearchPaths = ProjectKnowledgeSearchPaths(File("test-examples/resources/example_markdown"))

  val localProvider = new LocalProvider

  it("can list all local packages") {
    assert(localProvider.listInstalledPackages.size == 4)
  }

  it("can resolve a local package") {
    val r = Await.result(localProvider.resolvePackages(PackageRef("optic:rest")), 10 seconds)
    assert(r.foundAll)
  }

  it("will not resolve a non-existent local package") {
    val r = Await.result(localProvider.resolvePackages(PackageRef("optic:dadasd")), 10 seconds)
    assert(!r.foundAll)
  }

  it("does not work for parsers") {
    assert(localProvider.listInstalledParsers.size == 1)
  }

}
