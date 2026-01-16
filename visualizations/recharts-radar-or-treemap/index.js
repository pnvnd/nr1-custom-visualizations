import React from 'react';
import PropTypes from 'prop-types';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from 'recharts';
import {
  AutoSizer,
  Card,
  CardBody,
  HeadingText,
  NrqlQuery,
  Spinner,
} from 'nr1';

const CHART_TYPES = {
  Radar: 'radar',
  Treemap: 'treemap',
};

export default class RadarOrTreemapVisualization extends React.Component {
  // Custom props you wish to be configurable in the UI must also be defined in
  // the nr1.json file for the visualization. See docs for more details.
  static propTypes = {
    /**
     * A fill color to override the default fill color. This is an example of
     * a custom chart configuration.
     */
    fill: PropTypes.string,

    /**
     * A stroke color to override the default stroke color. This is an example of
     * a custom chart configuration.
     */
    stroke: PropTypes.string,
    /**
     * An array of objects consisting of a nrql `query` and `accountId`.
     * This should be a standard prop for any NRQL based visualizations.
     */
    queries: PropTypes.arrayOf(
      PropTypes.shape({
        accountId: PropTypes.number,
        query: PropTypes.string,
      })
    ),
  };

  /**
   * Restructure the data for a non-time-series, facet-based NRQL query into a
   * form accepted by the Recharts library's RadarChart.
   * (https://recharts.org/api/RadarChart).
   */
  transformData = (rawData) => {
    return rawData.map((entry) => ({
      name: entry.metadata.name,
      // Only grabbing the first data value because this is not time-series data.
      value: entry.data[0].y,
    }));
  };

  /**
   * Format the given axis tick's numeric value into a string for display.
   */
  formatTick = (value) => {
    return value.toLocaleString();
  };

  render() {
    const { queries, stroke, fill, selectedChart } = this.props;

    const nrqlQueryPropsAvailable =
      queries &&
      queries[0] &&
      queries[0].accountId &&
      queries[0].query;

    if (!nrqlQueryPropsAvailable) {
      return <EmptyState />;
    }

    return (
      <AutoSizer>
        {({ width, height }) => (
          <NrqlQuery
            query={queries[0].query}
            accountId={parseInt(queries[0].accountId)}
            pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
          >
            {({ data, loading, error }) => {
              if (loading) {
                return <Spinner />;
              }

              if (error) {
                return <ErrorState />;
              }

              const transformedData = this.transformData(data);

              return (
                <React.Fragment>
                  {!selectedChart || selectedChart === CHART_TYPES.Radar ? (
                    <RadarChart
                      width={width}
                      height={height}
                      data={transformedData}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis tickFormatter={this.formatTick} />
                      <Radar
                        dataKey="value"
                        stroke={stroke || '#51C9B7'}
                        fill={fill || '#51C9B7'}
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  ) : (
                    <Treemap
                      width={width}
                      height={height}
                      data={transformedData}
                      dataKey="value"
                      ratio={4 / 3}
                      stroke={stroke || '#000000'}
                      fill={fill || '#51C9B7'}
                    />
                  )}
                </React.Fragment>
              );
            }}
          </NrqlQuery>
        )}
      </AutoSizer>
    );
  }
}

const EmptyState = () => (
  <Card className="EmptyState">
    <CardBody className="EmptyState-cardBody">
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Please provide at least one NRQL query & account ID pair
      </HeadingText>
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
        type={HeadingText.TYPE.HEADING_4}
      >
        An example NRQL query you can try is:
      </HeadingText>
      <code>SELECT sum(GigabytesIngested) FROM NrConsumption FACET usageMetric SINCE 1 MONTH AGO</code>
    </CardBody>
  </Card>
);

const ErrorState = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Oops! Something went wrong.
      </HeadingText>
    </CardBody>
  </Card>
);