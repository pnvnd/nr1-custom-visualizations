import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';
import colorThemes from '../color_themes.json';

export default class HorizontalBarChartVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
        colorTheme: PropTypes.string,
    };

    transformData = (rawData) => {
        const transformedData = [];

        // Construct the initial data structure from raw data
        rawData.forEach(({ metadata, data }) => {
            //console.log(rawData);
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                const facet = metadata.groups[1] ? metadata.groups[1].value : "unknown";
                const value = data[0].y;
                transformedData.push({ name: facet, value });
            }
        });

        // Sort the transformedData by value in descending order
        transformedData.sort((a, b) => b.value - a.value);

        // Map to x and y for the bars
        const x = transformedData.map((entry) => entry.value);
        const y = transformedData.map((entry) => entry.name);

        return {
            x: x, // Use .reverse() to flip the order to have the longest bar at the top
            y: y.reverse(), // Also reverse the category labels to maintain the correct association
        };
    };

    render() {
        const { queries, color } = this.props;

        if (!queries || !queries.length || !queries[0].accountId || !queries[0].query) {
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

                            const { x, y } = this.transformData(data);

                            // Fetch the axis labels, swapping the labels for the vertical chart
                            const xAxisLabel = data && data[0].metadata.groups[0].displayName;
                            const yAxisLabel = data && data[0].metadata.groups[1].displayName;


                            const themeColors = Array.isArray(colorThemes.discrete[color]) ? colorThemes.discrete[color] : colorThemes.discrete['Plotly'];

                            const plotlyData = [
                                {
                                    x,
                                    y,
                                    type: 'bar',
                                    orientation: 'h',
                                    marker: {
                                        // Assign a color from themeColors based on the index of each bar
                                        color: x.map((_, i) => themeColors[i % themeColors.length]),
                                    },
                                    hoverlabel: { namelength: -1 }
                                }
                            ];

                            // Create the layout
                            const layout = {
                                barmode: 'group',
                                xaxis: {
                                    title: {
                                        text: xAxisLabel,
                                        font: {
                                            weight: 'bold'
                                        }
                                    },
                                    automargin: true,
                                    showgrid: true,
                                },
                                yaxis: {
                                    title: {
                                        text: yAxisLabel,
                                        font: {
                                            weight: 'bold'
                                        },
                                        standoff: 20 // Adjust this value to move the y-axis label further to the left
                                    },
                                    automargin: true,
                                    showgrid: true,
                                    type: 'category' // Categories are usually set on the y-axis for vertical bar charts
                                },
                                margin: {
                                    t: 5,
                                    b: 5,
                                    pad: 10
                                }
                            };

                            // Create the configuration object to remove Plotly logo
                            const config = {
                                displaylogo: false
                            };

                            return (
                                <Plot
                                    data={plotlyData}
                                    layout={layout}
                                    useResizeHandler
                                    style={{ width: '100%', height: '100%' }}
                                    config={config}
                                />
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
                An example NRQL query you can try is (remember to only use ONE facet):
            </HeadingText>
            <code>
                SELECT sum(GigabytesIngested) FROM NrConsumption FACET monthOf(timestamp), usageMetric SINCE 1 YEAR AGO LIMIT MAX
            </code>
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