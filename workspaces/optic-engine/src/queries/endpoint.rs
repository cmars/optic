use crate::commands::{EndpointCommand, SpecCommand};
use crate::events::HttpInteraction;
use crate::projections::endpoint::{Edge, EndpointProjection, Node, ROOT_PATH_ID};
use crate::projections::endpoint::{
  QueryParametersDescriptor, RequestDescriptor, ResponseBodyDescriptor,
};
use crate::state::endpoint::{
  HttpMethod, HttpStatusCode, PathComponentId, PathComponentIdRef, QueryParametersId, RequestId,
  ResponseId,
};
use petgraph::graph::Graph;
use petgraph::visit::{
  depth_first_search, Control, DfsEvent, EdgeFilteredNeighborsDirected, Reversed,
};
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

pub struct EndpointQueries<'a> {
  pub endpoint_projection: &'a EndpointProjection,
}

#[derive(Debug)]
struct ParentPathInfo {
  depth: usize,
  is_match: bool,
  is_parameter: bool,
}

impl<'a> EndpointQueries<'a> {
  pub fn new(endpoint_projection: &'a EndpointProjection) -> Self {
    EndpointQueries {
      endpoint_projection,
    }
  }

  fn extract_normalized_path(path: &str) -> &str {
    if path.eq("/") {
      path
    } else if path.ends_with("/") {
      &path[..path.len() - 1]
    } else {
      path
    }
  }

  pub fn resolve_interaction_path_v2(
    &self,
    interaction: &HttpInteraction,
  ) -> Option<PathComponentIdRef> {
    self.resolve_path_v2(&interaction.request.path)
  }

  pub fn resolve_path_v2(&self, path: &str) -> Option<PathComponentIdRef> {
    if path.eq("/") {
      return Some(ROOT_PATH_ID);
    }

    let root_path_node_index = self
      .graph_get_index(ROOT_PATH_ID)
      .expect("a root path component node should exist");
    let mut parents: HashMap<usize, ParentPathInfo> = HashMap::new();
    parents.insert(
      root_path_node_index.index(),
      ParentPathInfo {
        depth: 0,
        is_match: true,
        is_parameter: false,
      },
    );

    let path = Self::extract_normalized_path(path);
    let path_components: Vec<&str> = path.split('/').collect();
    let max_depth = path_components.len() - 1;
    let mut matches: Vec<(usize, &str)> = vec![];

    let reversed_graph = Reversed(&self.endpoint_projection.graph);
    let result: Control<Option<&String>> =
      depth_first_search(&reversed_graph, Some(*root_path_node_index), |event| {
        match event {
          DfsEvent::Discover(node_index, _) => {
            let node = self.endpoint_projection.graph.node_weight(node_index);
            // dbg!(&node);
            if let Some(Node::PathComponent(_, _)) = node {
              Control::Continue
            } else {
              Control::Prune
            }
          }
          DfsEvent::TreeEdge(parent_node_index, child_node_index) => {
            let child = self.endpoint_projection.graph.node_weight(child_node_index);
            if let Some(Node::PathComponent(path_id, info)) = child {
              let parent_path_info = parents
                .get(&parent_node_index.index())
                .expect("expected parent info to be populated");
              let depth = parent_path_info.depth + 1;
              // dbg!("checking", &path_id, &info);
              match depth.cmp(&max_depth) {
                Ordering::Greater => Control::Prune,
                leq => {
                  let path_component = path_components[depth];
                  if info.is_parameter || info.name == path_component {
                    // dbg!("match!");

                    parents.insert(
                      child_node_index.index(),
                      ParentPathInfo {
                        is_match: true,
                        depth,
                        is_parameter: info.is_parameter,
                      },
                    );

                    match leq {
                      Ordering::Equal => matches.push((child_node_index.index(), path_id)),
                      _ => {}
                    }

                    Control::Continue
                  } else {
                    // dbg!("no match!");

                    parents.insert(
                      child_node_index.index(),
                      ParentPathInfo {
                        is_match: false,
                        depth,
                        is_parameter: info.is_parameter,
                      },
                    );

                    Control::Prune
                  }
                }
              }
            } else {
              // only explore path component nodes
              Control::Prune
            }
          }
          x => {
            // dbg!("Non-TreeEdge", x);
            Control::Continue
          }
        }
      });
    if matches.len() == 0 {
      None
    } else {
      // dbg!(&matches);
      // dbg!(&parents);
      let static_match = matches.iter().find(|x| {
        let (node_index, path_id) = **x;
        let parent_info = parents
          .get(&node_index)
          .expect("expected info to be present");
        !parent_info.is_parameter
      });
      // dbg!(&static_match);
      static_match.map_or(Some(matches[0].1), |m| Some(m.1))
    }
  }

  #[deprecated(
    note = "this will not work as expected if the spec has multiple ambiguous path parameters. use resolve_interaction_path_v2"
  )]
  pub fn resolve_interaction_path(
    &self,
    interaction: &HttpInteraction,
  ) -> Option<PathComponentIdRef> {
    self.resolve_path(&interaction.request.path)
  }

  #[deprecated(
    note = "this will not work as expected if the spec has multiple ambiguous path parameters. use resolve_path_v2"
  )]
  pub fn resolve_path(&self, path: &str) -> Option<PathComponentIdRef> {
    if path.eq("/") {
      return Some(ROOT_PATH_ID);
    }

    let path = Self::extract_normalized_path(path);
    // eprintln!("{}", path);
    let mut path_components = path.split('/');
    // skip leading empty
    path_components.next();
    let mut last_resolved_path_id = Some(ROOT_PATH_ID);
    while let Some(s) = path_components.next() {
      // eprintln!("trying to match segment {}", s);
      let node_index = self
        .graph_get_index(last_resolved_path_id.unwrap())
        .expect("expected a node with node_id to exist");

      last_resolved_path_id = None;

      // first search for named path components
      let children = self.graph_get_children(node_index);
      for child in children {
        let child_node = self.endpoint_projection.graph.node_weight(child).unwrap();

        match child_node {
          Node::PathComponent(id, descriptor) => {
            // eprintln!("1 - neighbor {}", descriptor.name);
            if !descriptor.is_parameter {
              if descriptor.name == s {
                last_resolved_path_id = Some(id);
                break;
              }
            }
          }
          _ => {}
        }
      }
      if let Some(x) = last_resolved_path_id {
        continue;
      }
      // try path parameters since we didn't find any matches in regular path components
      let children = self.graph_get_children(node_index);
      for child in children {
        let child_node = self.endpoint_projection.graph.node_weight(child).unwrap();
        match child_node {
          Node::PathComponent(id, descriptor) => {
            // eprintln!("2 - neighbor {}", descriptor.name);

            if descriptor.is_parameter {
              last_resolved_path_id = Some(id);
              break;
            }
          }
          _ => {}
        }
      }
      if let Some(x) = last_resolved_path_id {
        continue;
      }
      return None;
    }
    last_resolved_path_id
  }

  pub fn resolve_unused_paths(&self) -> impl Iterator<Item = PathComponentId> + '_ {
    let root_path_node_index = self
      .graph_get_index(ROOT_PATH_ID)
      .expect("a root path component node should exist");

    let reversed_graph = Reversed(&self.endpoint_projection.graph);

    let mut path_ids_with_endpoints: HashSet<PathComponentId> = HashSet::new();
    let mut unused_path_ids: HashSet<PathComponentId> = HashSet::new();
    let mut unused_path_ids_sorted: Vec<PathComponentId> = Vec::new();
    let mut path_ids_by_index = HashMap::new();
    let mut children_path_ids_by_path_id = HashMap::new();

    depth_first_search(&reversed_graph, Some(*root_path_node_index), |event| {
      match event {
        // Discovered a new node
        DfsEvent::Discover(discovered_node_index, time) => {
          let node = self
            .endpoint_projection
            .graph
            .node_weight(discovered_node_index);
          if let Some(Node::PathComponent(path_id, _)) = node {
            path_ids_by_index.insert(discovered_node_index, path_id.clone());
            children_path_ids_by_path_id.insert(path_id.clone(), vec![]);
            Control::Continue
          } else {
            Control::Prune // Stop going down this branch when not a path component
          }
        }
        // discovered an outgoing edge from an already discovered node
        DfsEvent::TreeEdge(parent_node_index, child_node_index) => {
          let child_node = self
            .endpoint_projection
            .graph
            .node_weight(child_node_index)
            .expect("target node should exists");

          let path_id = path_ids_by_index
            .get(&parent_node_index)
            .expect("parent path node should already have been discovered");

          match child_node {
            Node::PathComponent(child_path_id, _) => {
              let children_path_ids = children_path_ids_by_path_id
                .get_mut(path_id)
                .expect("parent should have created collection of child paths");
              children_path_ids.push(child_path_id);
              Control::Continue // we'll want to discover at the target edge as well
            }
            Node::HttpMethod(method) => {
              let request_ids = self
                .resolve_requests(path_id, method)
                .expect("path should exist")
                .map(|_| ());
              let response_ids = self
                .resolve_responses(path_id, method)
                .expect("path should exist")
                .map(|_| ());

              if let Some(_) = request_ids.chain(response_ids).next() {
                // found a request or response, path is being used
                path_ids_with_endpoints.insert(path_id.clone());
              }

              Control::Prune // no more paths down this branch
            }
            _ => Control::Prune, // no more paths down this branch
          }
        }
        DfsEvent::Finish(finished_node_index, time) => {
          let is_root_node = *root_path_node_index == finished_node_index;
          let path_id = path_ids_by_index
            .get(&finished_node_index)
            .expect("finished path node should already have been discovered");

          let has_used_child = children_path_ids_by_path_id
            .get(path_id)
            .expect("collection of child paths should have been created during discovery")
            .iter()
            .any(|child_path_id| !unused_path_ids.contains(*child_path_id));

          if !path_ids_with_endpoints.contains(path_id) && !has_used_child && !is_root_node {
            unused_path_ids.insert(path_id.clone());
            unused_path_ids_sorted.push(path_id.clone());
          }

          if is_root_node {
            Control::Break(())
          } else {
            Control::Continue
          }
        }
        _ => Control::Continue,
      }
    });

    unused_path_ids_sorted.into_iter()
  }

  pub fn resolve_operations_by_request_method(
    &self,
    method: &'a String,
    path_id: PathComponentIdRef,
  ) -> impl Iterator<Item = (&RequestId, &RequestDescriptor)> {
    self
      .resolve_requests(path_id, method)
      .expect("expected a operations to exist")
  }

  pub fn resolve_operations(
    &self,
    interaction: &'a HttpInteraction,
    path_id: PathComponentIdRef,
  ) -> impl Iterator<Item = (&RequestId, &RequestDescriptor)> {
    self.resolve_operations_by_request_method(&interaction.request.method, path_id)
  }

  pub fn resolve_endpoint_query_params(
    &self,
    path_id: PathComponentIdRef,
    method: &String,
  ) -> Option<(&QueryParametersId, &QueryParametersDescriptor)> {
    self
      .endpoint_projection
      .get_endpoint_query_parameter_node(&path_id.to_owned(), method)
  }

  pub fn resolve_requests(
    &self,
    path_id: PathComponentIdRef,
    method: &'a String,
  ) -> Option<impl Iterator<Item = (&RequestId, &RequestDescriptor)>> {
    let path_node_index = self.graph_get_index(path_id)?;
    let children = self
      .endpoint_projection
      .graph
      .neighbors_directed(*path_node_index, petgraph::Direction::Incoming);
    let matching_method = children
      .filter(move |i| {
        let node = self.endpoint_projection.graph.node_weight(*i).unwrap();
        match node {
          Node::HttpMethod(http_method) => method == http_method,
          _ => false,
        }
      })
      .flat_map(move |i| {
        let children = self
          .endpoint_projection
          .graph
          .neighbors_directed(i, petgraph::Direction::Incoming);

        let operations = children.filter_map(move |i| {
          let node = self.endpoint_projection.graph.node_weight(i).unwrap();
          match node {
            Node::Request(request_id, request_descriptor) => Some((request_id, request_descriptor)),
            _ => None,
          }
        });
        operations
      });
    Some(matching_method)
  }

  pub fn resolve_request_by_method_and_content_type(
    &self,
    path_id: PathComponentIdRef,
    method: &'a String,
    content_type: Option<&'a String>,
  ) -> Option<(&RequestId, &RequestDescriptor)> {
    self.resolve_requests(path_id, method).and_then(|mut it| {
      it.find(|(id, body)| match content_type {
        Some(content_type) => match body.body {
          Some(ref body) => body.http_content_type.eq(content_type),
          None => false,
        },
        None => body.body.is_none(),
      })
    })
  }

  pub fn resolve_responses(
    &self,
    path_id: &'a PathComponentId,
    method: &'a String,
  ) -> Option<impl Iterator<Item = (&ResponseId, &ResponseBodyDescriptor)>> {
    let response_nodes = self
      .endpoint_projection
      .get_endpoint_response_nodes(path_id, method)?;

    Some(response_nodes.map(|node| match node {
      Node::Response(response_id, body_descriptor) => (response_id, body_descriptor),
      _ => unreachable!("get response nodes should only return response nodes"),
    }))
  }

  pub fn resolve_response_by_method_status_code_and_content_type(
    &self,
    path_id: PathComponentIdRef,
    method: &'a str,
    status_code: u16,
    content_type: Option<&'a String>,
  ) -> Option<(&ResponseId, &ResponseBodyDescriptor)> {
    self
      .resolve_responses_by_method_and_status_code(method, status_code, path_id)
      .find(|(id, body)| match content_type {
        Some(content_type) => match body.body {
          Some(ref body) => body.http_content_type.eq(content_type),
          None => false,
        },
        None => body.body.is_none(),
      })
  }

  pub fn resolve_responses_by_method_and_status_code(
    &self,
    method: &'a str,
    status_code: u16,
    path_id: PathComponentIdRef,
  ) -> impl Iterator<Item = (&ResponseId, &ResponseBodyDescriptor)> {
    let path_node_index = self
      .graph_get_index(path_id)
      .expect("expected a node with node_id to exist");
    let children = self
      .endpoint_projection
      .graph
      .neighbors_directed(*path_node_index, petgraph::Direction::Incoming);
    let matching_status_code = children
      .filter(move |i| {
        let node = self.endpoint_projection.graph.node_weight(*i).unwrap();
        // eprintln!("method node {:?}", node);
        match node {
          Node::HttpMethod(http_method) => method == *http_method,
          _ => false,
        }
      })
      .flat_map(move |i| {
        // eprintln!("method node id {:?}", i);
        let children = self
          .endpoint_projection
          .graph
          .neighbors_directed(i, petgraph::Direction::Incoming);
        let status_code_nodes = children.filter_map(move |i| {
          // eprintln!("method child node id {:?}", i);
          let node = self.endpoint_projection.graph.node_weight(i).unwrap();
          match node {
            Node::HttpStatusCode(http_status_code) => {
              // eprintln!("status code {:?}", http_status_code);
              if status_code == *http_status_code {
                Some(i)
              } else {
                None
              }
            }
            _ => None,
          }
        });
        status_code_nodes
      })
      .flat_map(move |i| {
        let children = self
          .endpoint_projection
          .graph
          .neighbors_directed(i, petgraph::Direction::Incoming);
        let response_nodes = children.filter_map(move |i| {
          // eprintln!("status_code child node id {:?}", i);
          let node = self.endpoint_projection.graph.node_weight(i).unwrap();
          // eprintln!("status_code child node {:?}", node);
          match node {
            Node::Response(response_id, response_descriptor) => {
              Some((response_id, response_descriptor))
            }
            _ => None,
          }
        });
        response_nodes
      });
    matching_status_code
  }

  pub fn delete_endpoint_commands(
    &self,
    path_id: &'a PathComponentId,
    method: &'a HttpMethod,
  ) -> Option<DeleteEndpointCommands> {
    let query_param_id = self
      .resolve_endpoint_query_params(path_id, method)
      .map(|(query_param_id, _)| query_param_id);
    let request_ids = self
      .resolve_requests(path_id, method)?
      .map(|(request_id, _)| request_id);
    let response_ids = self
      .resolve_responses(path_id, method)?
      .map(|(response_id, _)| response_id);

    let query_parameter_command = query_param_id
      .cloned()
      .map(EndpointCommand::remove_query_parameters);
    let request_commands = request_ids.cloned().map(EndpointCommand::remove_request);
    let response_commands = response_ids.cloned().map(EndpointCommand::remove_response);

    Some(DeleteEndpointCommands {
      path_id: path_id.clone(),
      method: method.clone(),
      commands: request_commands
        .chain(response_commands)
        .chain(query_parameter_command)
        .map(SpecCommand::from)
        .collect(),
    })
  }

  pub fn delete_path_commands(
    &self,
    path_id: &'a PathComponentId,
  ) -> Option<impl Iterator<Item = EndpointCommand>> {
    let path_descriptor = self
      .endpoint_projection
      .get_path_component_descriptor(path_id)?;
    let command = if path_descriptor.is_parameter {
      EndpointCommand::remove_path_parameter(path_id.clone())
    } else {
      EndpointCommand::remove_path_component(path_id.clone())
    };

    Some(std::iter::once(command))
  }

  fn graph_get_index(&self, node_id: &str) -> Option<&petgraph::graph::NodeIndex> {
    self.endpoint_projection.node_id_to_index.get(node_id)
  }

  fn graph_get_node(&self, node_id: &str) -> &Node {
    self
      .endpoint_projection
      .graph
      .node_weight(
        *self
          .graph_get_index(node_id)
          .expect("expected a node with node_id to exist"),
      )
      .expect("expected node with node_id to exist")
  }

  fn graph_get_children(
    &self,
    node_index: &petgraph::graph::NodeIndex,
  ) -> petgraph::graph::Neighbors<Edge> {
    let neighbors = self
      .endpoint_projection
      .graph
      .neighbors_directed(*node_index, petgraph::Direction::Incoming);
    return neighbors;
  }
}

#[derive(Debug, Serialize)]
pub struct DeleteEndpointCommands {
  path_id: PathComponentId,
  method: HttpMethod,
  commands: Vec<SpecCommand>,
}

#[cfg(test)]
mod test {
  use super::*;
  use crate::events::SpecEvent;
  use crate::projections::SpecProjection;
  use crate::Aggregate;
  use insta::assert_debug_snapshot;
  use petgraph::dot::Dot;
  use serde_json::json;

  fn interaction_with_path(path: String) -> HttpInteraction {
    serde_json::from_value(json!(
      {
        "uuid": "id",
        "request": {
          "host": "example.com",
          "method": "GET",
          "path": path,
          "query": {
            "shapeHashV1Base64": null,
            "asJsonString": null,
            "asText": null
          },
          "headers": {
            "shapeHashV1Base64": null,
            "asJsonString": null,
            "asText": null
          },
          "body": {
            "contentType": null,
            "value": {
              "shapeHashV1Base64": null,
              "asJsonString": null,
              "asText": null
            }
          }
        },
        "response": {
          "statusCode": 200,
          "headers": {
            "shapeHashV1Base64": null,
            "asJsonString": null,
            "asText": null
          },
          "body": {
            "contentType": null,
            "value": {
              "shapeHashV1Base64": null,
              "asJsonString": null,
              "asText": null
            }
          }
        },
        "tags": []
      }
    ))
    .unwrap()
  }
  #[test]
  pub fn can_ignore_trailing_slash() {
    let interaction: HttpInteraction = interaction_with_path(String::from("/a/b/c/"));
    let normalized_path = EndpointQueries::extract_normalized_path(&interaction.request.path);
    assert_eq!(normalized_path, "/a/b/c")
  }

  #[test]
  pub fn can_handle_no_trailing_slash() {
    let interaction: HttpInteraction = interaction_with_path(String::from("/a/b/c"));
    let normalized_path = EndpointQueries::extract_normalized_path(&interaction.request.path);
    assert_eq!(normalized_path, "/a/b/c")
  }
  #[test]
  pub fn can_handle_root_path() {
    let interaction: HttpInteraction = interaction_with_path(String::from("/"));
    let normalized_path = EndpointQueries::extract_normalized_path(&interaction.request.path);
    assert_eq!(normalized_path, "/")
  }

  #[test]
  pub fn resolve_path_can_resolves_root_path() {
    let events: Vec<SpecEvent> = serde_json::from_value(json!([
      {"PathComponentAdded": { "pathId": "path_1", "parentPathId": "root", "name": "posts" }},
      {"PathComponentAdded": { "pathId": "path_2", "parentPathId": "path_1", "name": "favourites" }},
      {"PathComponentAdded": { "pathId": "path_3", "parentPathId": "root", "name": "authors" }},
      {"PathComponentAdded": { "pathId": "path_4", "parentPathId": "path_3", "name": "dutch" }},
      {"RequestAdded": { "requestId": "request_1", "pathId": "root", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_1", "pathId": "root", "httpMethod": "GET", "httpStatusCode": 200 }},
    ]))
    .expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    assert_eq!(endpoint_queries.resolve_path("/").unwrap(), "root");
  }

  ////////////////////////////////////////////////////////////////////////////////

  #[test]
  pub fn resolve_path_v2_can_resolve_ambiguous_paths() {
    // /sports/sport1
    // /sports/sport2
    // /sports/sport2/games
    // /sports/sport2/games/{gameId}
    // /sports/sport2/games/{gameId}/stats
    // /sports/sport2/games/{year}
    // /sports/sport2/games/{year}/{month}
    // /sports/sport2/games/{year}/{month}/{day}
    // /sports/sport2/games/{year}/{month}/{day}/stats
    let events: Vec<SpecEvent> = serde_json::from_value(json!([
      {"PathComponentAdded": { "pathId": "path_1", "parentPathId": "root", "name": "sports" }},
      {"PathComponentAdded": { "pathId": "path_2", "parentPathId": "path_1", "name": "sport1" }},
      {"PathComponentAdded": { "pathId": "path_3", "parentPathId": "path_1", "name": "sport2" }},
      {"PathComponentAdded": { "pathId": "path_4", "parentPathId": "path_3", "name": "games" }},
      // gameId and year are the ambiguous path parameters
      {"PathParameterAdded": { "pathId": "path_5", "parentPathId": "path_4", "name": "gameId" }},
      {"PathParameterAdded": { "pathId": "path_6", "parentPathId": "path_4", "name": "year" }},
      {"PathParameterAdded": { "pathId": "path_7", "parentPathId": "path_6", "name": "month" }},
      {"PathParameterAdded": { "pathId": "path_8", "parentPathId": "path_7", "name": "day" }},
      {"PathComponentAdded": { "pathId": "path_9", "parentPathId": "path_8", "name": "stats" }},
      {"PathComponentAdded": { "pathId": "path_10", "parentPathId": "path_5", "name": "stats" }},
      {"RequestAdded": { "requestId": "request_1", "pathId": "root", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_1", "pathId": "root", "httpMethod": "GET", "httpStatusCode": 200 }},
    ]))
    .expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    assert_eq!(endpoint_queries.resolve_path_v2("/").unwrap(), "root");
    assert_eq!(
      endpoint_queries.resolve_path_v2("/sports/sport1").unwrap(),
      "path_2"
    );
    assert_eq!(
      endpoint_queries.resolve_path_v2("/sports/sport2").unwrap(),
      "path_3"
    );
    assert_eq!(
      endpoint_queries.resolve_path_v2("/sports/sport1/games"),
      None
    );
    assert_eq!(
      endpoint_queries
        .resolve_path_v2("/sports/sport2/games/123/stats")
        .unwrap(),
      "path_10"
    );
    assert_eq!(
      endpoint_queries.resolve_path_v2("/sports/sport2/games/123/winners"),
      Some("path_7")
    );
    assert_eq!(
      endpoint_queries.resolve_path_v2("/sports/sport2/games/123/456/789/stats"),
      Some("path_9")
    );
  }

  ////////////////////////////////////////////////////////////////////////////////

  #[test]
  pub fn resolve_path_should_resolve_against_an_empty_spec() {
    let events: Vec<SpecEvent> =
      serde_json::from_value(json!([])).expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    assert_eq!(endpoint_queries.resolve_path("/").unwrap(), "root");
  }

  #[test]
  pub fn can_find_unused_paths() {
    let events: Vec<SpecEvent> = serde_json::from_value(json!([
      {"PathComponentAdded": { "pathId": "path_1", "parentPathId": "root", "name": "posts" }},
      {"PathComponentAdded": { "pathId": "path_2", "parentPathId": "path_1", "name": "favourites" }},
      {"PathComponentAdded": { "pathId": "path_3", "parentPathId": "root", "name": "authors" }},
      {"PathComponentAdded": { "pathId": "path_4", "parentPathId": "path_3", "name": "dutch" }},
      {"PathParameterAdded":{"pathId":"path_parameter_1","parentPathId":"path_1","name":"postId"}},
      {"ShapeAdded":{"shapeId":"shape_1","baseShapeId":"$string","parameters":{"DynamicParameterList":{"shapeParameterIds":[]}},"name":"" }},
      {"PathParameterShapeSet":{"pathId":"path_parameter_1","shapeDescriptor":{"shapeId":"shape_Ba53AWXhVW","isRemoved":false} }},

      {"RequestAdded": { "requestId": "request_1", "pathId": "path_2", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_1", "pathId": "path_2", "httpMethod": "GET", "httpStatusCode": 200 }},

      {"RequestAdded": { "requestId": "request_2", "pathId": "path_1", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_2", "pathId": "path_1", "httpMethod": "GET", "httpStatusCode": 200 }},

      {"RequestRemoved": { "requestId": "request_2" }},
      {"ResponseRemoved": { "responseId": "response_2" }},
    ]))
    .expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    let unused_path_ids = endpoint_queries.resolve_unused_paths().collect::<Vec<_>>();

    assert_debug_snapshot!("can_find_unused_paths__unused_paths", unused_path_ids);
  }

  #[test]
  pub fn can_generate_delete_endpoint_commands() {
    let events: Vec<SpecEvent> = serde_json::from_value(json!([
      {"PathComponentAdded": { "pathId": "path_1", "parentPathId": "root", "name": "posts" }},
      {"PathComponentAdded": { "pathId": "path_2", "parentPathId": "path_1", "name": "favourites" }},
      {"PathComponentAdded": { "pathId": "path_3", "parentPathId": "root", "name": "authors" }},

      {"RequestAdded": { "requestId": "request_1", "pathId": "path_2", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_1", "pathId": "path_2", "httpMethod": "GET", "httpStatusCode": 200 }},

      {"RequestAdded": { "requestId": "request_2", "pathId": "path_2", "httpMethod": "POST"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_2", "pathId": "path_2", "httpMethod": "POST", "httpStatusCode": 201 }},

      {"RequestAdded": { "requestId": "request_3", "pathId": "path_3", "httpMethod": "GET"}},
      {"ResponseAddedByPathAndMethod": {"responseId": "response_3", "pathId": "path_3", "httpMethod": "GET", "httpStatusCode": 200 }},

      {"QueryParametersAdded": {"queryParametersId": "query_1", "httpMethod": "GET", "pathId": "path_2"}},
      {"QueryParametersShapeSet": {"queryParametersId": "query_1", "shapeDescriptor":{"shapeId":"shape_Ba53AWXhVW","isRemoved":false}}},
    ]))
    .expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    let subject_path = String::from("path_2");
    let subject_method = String::from("GET");
    let deleted_endpoint_commmands = endpoint_queries
      .delete_endpoint_commands(&subject_path, &subject_method)
      .expect("delete commands are generated for existing path and method");

    let updated_spec =
      assert_valid_commands(spec_projection.clone(), deleted_endpoint_commmands.commands);
    let updated_queries = EndpointQueries::new(&updated_spec.endpoint());
    let remaining_query_parameters =
      updated_queries.resolve_endpoint_query_params(&subject_path, &subject_method);
    let remaining_requests = updated_queries
      .resolve_requests(&subject_path, &subject_method)
      .unwrap()
      .collect::<Vec<_>>();
    let remaining_responses = updated_queries
      .resolve_responses(&subject_path, &subject_method)
      .unwrap()
      .collect::<Vec<_>>();

    // dbg!(Dot::with_config(&updated_spec.endpoint().graph, &[]));

    assert!(remaining_query_parameters.is_none());
    assert_eq!(remaining_requests.len(), 0);
    assert_eq!(remaining_responses.len(), 0);
  }

  #[test]
  pub fn can_generate_delete_path_commands() {
    let events: Vec<SpecEvent> = serde_json::from_value(json!([
      {"PathComponentAdded": { "pathId": "path_1", "parentPathId": "root", "name": "posts" }},
      {"PathComponentAdded": { "pathId": "path_2", "parentPathId": "path_1", "name": "favourites" }},
      {"PathComponentAdded": { "pathId": "path_3", "parentPathId": "root", "name": "authors" }},

      {"PathParameterAdded":{"pathId":"path_parameter_1","parentPathId":"path_1","name":"postId"}},
      {"ShapeAdded":{"shapeId":"shape_1","baseShapeId":"$string","parameters":{"DynamicParameterList":{"shapeParameterIds":[]}},"name":"" }},
      {"PathParameterShapeSet":{"pathId":"path_parameter_1","shapeDescriptor":{"shapeId":"shape_Ba53AWXhVW","isRemoved":false} }},
    ]))
    .expect("should be able to deserialize test events");

    let spec_projection = SpecProjection::from(events);
    // dbg!(Dot::with_config(&spec_projection.endpoint().graph, &[]));

    let endpoint_queries = EndpointQueries::new(spec_projection.endpoint());

    let subjects = [("path_3", "/authors"), ("path_parameter_1", "/posts/1")];

    let delete_path_commands = subjects
      .iter()
      .flat_map(|(subject_path_id, _)| {
        endpoint_queries
          .delete_path_commands(&String::from(*subject_path_id))
          .expect("delete commands are generated for existing path")
      })
      .map(|endpoint_command| SpecCommand::from(endpoint_command))
      .collect::<Vec<_>>();

    let updated_spec = assert_valid_commands(spec_projection.clone(), delete_path_commands);
    let updated_queries = EndpointQueries::new(&updated_spec.endpoint());
    let remaining_paths = subjects
      .iter()
      .filter_map(|(_, subject_path)| updated_queries.resolve_path(*subject_path))
      .collect::<Vec<_>>();

    // dbg!(Dot::with_config(&updated_spec.endpoint().graph, &[]));

    // TODO: enable assertion once projection is updated
    assert_eq!(remaining_paths.len(), 0);
  }

  fn assert_valid_commands(
    mut spec_projection: SpecProjection,
    commands: impl IntoIterator<Item = SpecCommand>,
  ) -> SpecProjection {
    // let mut spec_projection = SpecProjection::default();
    for command in commands {
      let events = spec_projection
        .execute(command)
        .expect("generated commands must be valid");

      for event in events {
        spec_projection.apply(event)
      }
    }

    spec_projection
  }
}
