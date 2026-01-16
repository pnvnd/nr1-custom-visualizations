import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';
import colorThemes from '../color_themes.json';

export default class VerticalBarChartVisualization extends React.Component {
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
        const barData = transformedData.map((entry) => entry.value);

        return {
            barData,
            categories: transformedData.map(entry => entry.name) // The names for the x-axis categories.
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

                            const { barData, categories } = this.transformData(data);

                            // Fetch the axis labels
                            const xAxisLabel = data && data[0].metadata.groups[0].displayName;
                            const yAxisLabel = data && data[0].metadata.groups[1].displayName;

                            const themeColors = Array.isArray(colorThemes.discrete[color]) ? colorThemes.discrete[color] : colorThemes.discrete['Plotly'];
                            const plotlyData = [
                                {
                                    x: categories,
                                    y: barData,
                                    type: 'bar',
                                    orientation: 'v',
                                    marker: {
                                        color: barData.map((_, i) => themeColors[i % themeColors.length]),
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
                                        },
                                        standoff: 20
                                    },
                                    automargin: true,
                                    showgrid: true,
                                    tickmode: 'array',
                                    tickvals: categories.map((c, index) => index),
                                    ticktext: categories,
                                },
                                yaxis: {
                                    title: {
                                        text: yAxisLabel,
                                        font: {
                                            weight: 'bold'
                                        },
                                        standoff: 20
                                    },
                                    automargin: true,
                                    showgrid: true,
                                    zeroline: false
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
                SELECT median(duration) AS 'Median Duration (s)' FROM PageView FACET countryCode AS 'Country' SINCE 3 MONTHS AGO LIMIT MAX
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