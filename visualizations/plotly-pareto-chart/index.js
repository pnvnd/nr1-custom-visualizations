import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';

export default class ParetoChartVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
    };

    transformData = (rawData) => {
        // console.log(rawData);
        const transformedData = [];
        let runningTotalPercentage = 0;

        // Construct the initial data structure from raw data and calculate total
        let grandTotal = 0;
        rawData.forEach(({ metadata, data }) => {
            //console.log(rawData);
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                const facet1 = metadata.groups[1] ? metadata.groups[1].value : "unknown";
                const value = data[0].y;
                grandTotal += value;
                transformedData.push({ name: facet1, value });
            }
        });

        // Sort the transformedData by value in descending order
        transformedData.sort((a, b) => b.value - a.value);

        // Map to x and y for the bars and calculate cumulative percentage for the line
        const barData = transformedData.map((entry) => entry.value);
        const cumulativePercentageData = transformedData.map((entry) => {
            runningTotalPercentage += (entry.value / grandTotal) * 100;
            return runningTotalPercentage;
        });

        return {
            barData,
            cumulativePercentageData,
            categories: transformedData.map(entry => entry.name) // The names for the x-axis categories.
        };
    };

    render() {
        const { queries } = this.props;

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

                            const { barData, cumulativePercentageData, categories } = this.transformData(data);

                            // Fetch the axis labels
                            const xAxisLabel = data && data[0].metadata.groups[1].displayName;
                            const yAxisLabel = data && data[0].metadata.groups[0].displayName;

                            // Prepare data for Plotly
                            const plotlyData = [
                                {
                                    x: categories,
                                    y: barData,
                                    type: 'bar',
                                    name: yAxisLabel,
                                    hoverinfo: 'y+text', // displays both the y-value and the text
                                    hoverlabel: { namelength: -1 }, // display full text without truncation
                                    hovertemplate: '%{y:,.2f}<extra></extra>', // Rounded to two decimal places with commas
                                },
                                {
                                    x: categories,
                                    y: cumulativePercentageData,
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    yaxis: 'y2',
                                    name: 'Cumulative Percentage',
                                    hoverlabel: { namelength: -1 }, // display full text without truncation
                                    hovertemplate: '%{y:.2f}%<extra></extra>', // Rounded to two decimal places for percentage
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
                                    showgrid: false
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
                                    showgrid: false,
                                    zeroline: false
                                },
                                yaxis2: {
                                    title: 'Cumulative Percentage (%)',
                                    overlaying: 'y',
                                    side: 'right',
                                    showgrid: true,
                                    zeroline: false,
                                    range: [0, 100],
                                    titlefont: {
                                        weight: 'bold'
                                    }
                                },
                                margin: {
                                    t: 0,
                                    b: 0,
                                    pad: 10
                                },
                                legend: {
                                    orientation: 'h',
                                    y: 1.1,
                                    x: 1,
                                    xanchor: 'right',
                                    yanchor: 'top'
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
                SELECT sum(GigabytesIngested) FROM NrConsumption WHERE usageMetric NOT IN ('MetricsBytes','CustomEventsBytes') FACET usageMetric SINCE 1 MONTH AGO LIMIT MAX
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