import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';

export default class HeatmapVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
        color: PropTypes.string
    };

    transformData = (rawData) => {
        const transformedData = [];
        const xLabels = new Set();
        const yLabels = new Set();

        rawData.forEach(({ metadata, data }) => {
            //console.log(rawData);
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                const facet1 = metadata.groups[1] ? metadata.groups[1].value : "unknown";
                const facet2 = metadata.groups[2] ? metadata.groups[2].value : "unknown";
                const value = data[0].y; // The value for the heatmap cell
                
                yLabels.add(facet1);
                xLabels.add(facet2);
    
                transformedData.push({ x: facet2, y: facet1, value });
            }
        });

        // Convert sets to arrays
        const xArray = Array.from(xLabels);
        const yArray = Array.from(yLabels);

        // Prepare a matrix for the heatmap
        const zMatrix = yArray.map(yLabel =>
            xArray.map(xLabel => {
                const entry = transformedData.find(d => d.x === xLabel && d.y === yLabel);
                return entry ? entry.value : 0; // Default to 0 if no value
            })
        );

        return {
            z: zMatrix,
            x: xArray,
            y: yArray
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

                            const { z, x, y } = this.transformData(data);

                            // Fetch the axis labels
                            const xAxisLabel = data && data[0].metadata.groups[0].displayName;
                            const yAxisLabel = data && data[0].metadata.groups[1].displayName;

                            // Check if x contains weekdays
                            const isWeekday = x.some(xLabel => 
                                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(xLabel)
                            );

                            let xAxisCategories;

                            if (isWeekday) {
                                // Define the order of the weekdays
                                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                const uniqueXLabels = new Set(x);
                                xAxisCategories = daysOfWeek.filter(day => uniqueXLabels.has(day));
                            } else {
                                xAxisCategories = x; // Fallback to the original x labels
                            }

                            // Create the heatmap data
                            const plotlyData = [{
                                z,
                                x: xAxisCategories,
                                y,
                                type: 'heatmap',
                                colorscale: color,
                                colorbar: {
                                    title: xAxisLabel,
                                },
                            }];
                            
                            // Create the layout
                            const layout = {
                                xaxis: {
                                    automargin: true,
                                    tickmode: 'array',
                                },
                                yaxis: {
                                    title: yAxisLabel,
                                    automargin: true,
                                    tickmode: 'linear', // Ensure all y-axis tick marks are shown
                                    //tickvals: y, // Use the full set of y values as tick marks
                                   // ticktext: y, // Show the corresponding text labels
                                },
                                margin: {
                                    t: 40,
                                    b: 40,
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
                An example NRQL query you can try is:
            </HeadingText>
            <code>
                SELECT sum(GigabytesIngested) FROM NrConsumption FACET dayOfMonthOf(timestamp), weekdayOf(timestamp) SINCE THIS MONTH LIMIT MAX
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
