use crate::events::http_interaction::{Body, HttpInteraction};
use crate::learn_shape::{observe_body_trails, TrailObservationsResult};
use crate::projections::{EndpointProjection, SpecProjection};
use crate::protos::shapehash::ShapeDescriptor;
use crate::queries::endpoint::EndpointQueries;
use crate::shapes::diff as diff_shape;
use crate::state::body::BodyDescriptor;

pub mod result;
mod traverser;
mod visitors;

use result::InteractionTrail;
pub use result::{BodyAnalysisLocation, BodyAnalysisResult, InteractionDiffResult};
use visitors::{InteractionVisitors, PathVisitor};

pub fn diff(
  spec_projection: &SpecProjection,
  http_interaction: HttpInteraction,
) -> Vec<InteractionDiffResult> {
  let endpoint_projection = spec_projection.endpoint();
  let endpoint_queries = EndpointQueries::new(endpoint_projection);
  let interaction_traverser = traverser::Traverser::new(&endpoint_queries);
  let mut diff_visitors = visitors::diff::DiffVisitors::new();

  interaction_traverser.traverse(&http_interaction, &mut diff_visitors);

  let results = diff_visitors.take_results().unwrap();

  results
    .into_iter()
    .flat_map(move |result| match result {
      InteractionDiffResult::MatchedRequestBodyContentType(result) => {
        // eprintln!("shape diffing for matched a request body content type");
        let body = &http_interaction.request.body.value;
        let shape_diff_results =
          diff_shape(spec_projection.shape(), body.into(), &result.root_shape_id);
        shape_diff_results
          .into_iter()
          .map(|shape_diff| {
            InteractionDiffResult::UnmatchedRequestBodyShape(
              result.clone().into_shape_diff(shape_diff),
            )
          })
          .collect()
      }
      InteractionDiffResult::MatchedResponseBodyContentType(result) => {
        // eprintln!(
        //   "interaction-diff: shape diffing for matched a response body content type: {:?}",
        //   &http_interaction.response.body
        // );
        let body = &http_interaction.response.body.value;
        let shape_diff_results =
          diff_shape(spec_projection.shape(), body.into(), &result.root_shape_id);
        shape_diff_results
          .into_iter()
          .map(|shape_diff| {
            InteractionDiffResult::UnmatchedResponseBodyShape(
              result.clone().into_shape_diff(shape_diff),
            )
          })
          .collect()
      }
      _ => vec![result],
    })
    .collect()
}

pub fn analyze_undocumented_bodies(
  spec_projection: &SpecProjection,
  interaction: HttpInteraction,
) -> impl Iterator<Item = BodyAnalysisResult> {
  let endpoint_projection = spec_projection.endpoint();
  let endpoint_queries = EndpointQueries::new(endpoint_projection);
  let interaction_traverser = traverser::Traverser::new(&endpoint_queries);
  let mut diff_visitors = visitors::diff::DiffVisitors::new();

  interaction_traverser.traverse(&interaction, &mut diff_visitors);

  let results = diff_visitors.take_results().unwrap();

  results.into_iter().filter_map(move |result| match result {
    InteractionDiffResult::UnmatchedRequestBodyContentType(diff) => {
      let body = &interaction.request.body;
      let trail_observations = observe_body_trails(&body.value);
      let interaction_trail = diff.interaction_trail.clone();
      let path_id = diff
        .requests_trail
        .get_path_id()
        .expect("UnmatchedRequestBodyContentType implies request to have a known path")
        .clone();

      Some(BodyAnalysisResult {
        body_location: BodyAnalysisLocation::from(diff),
        trail_observations,
      })
    }
    InteractionDiffResult::UnmatchedResponseBodyContentType(diff) => {
      let body = &interaction.response.body;
      let trail_observations = observe_body_trails(&body.value);
      let interaction_trail = diff.interaction_trail.clone();
      let path_id = diff
        .requests_trail
        .get_path_id()
        .expect("UnmatchedResponseBodyContentType implies request to have a known path")
        .clone();
      let method = interaction_trail
        .get_method()
        .expect("UnmatchedResponseBodyContentType implies request to have a method");

      Some(BodyAnalysisResult {
        body_location: BodyAnalysisLocation::from(diff),
        trail_observations,
      })
    }
    _ => None,
  })
}
