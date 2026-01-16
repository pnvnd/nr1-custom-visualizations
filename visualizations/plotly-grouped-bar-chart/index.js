import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';

export default class GroupedBarChartVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
    };

    // Function to sort by monthOf or weekdayOf
    sortByMonthAndYearOrWeekday = (a, b) => {
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const weekdayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Check if the facet contains a weekday
        if (weekdayOrder.includes(a) && weekdayOrder.includes(b)) {
            return weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b);
        }

        const [aMonth, aYear] = a.split(" ");
        const [bMonth, bYear] = b.split(" ");

        if (aYear !== bYear) {
            return parseInt(aYear) - parseInt(bYear);
        }

        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
    };

    transformData = (rawData) => {
        const transformedData = [];

        // Construct the initial data structure from the raw data
        rawData.forEach(({ metadata, data }) => {
            //console.log(rawData);
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                const facet1 = metadata.groups[1] ? metadata.groups[1].value : "unknown";
                const facet2 = metadata.groups[2] ? metadata.groups[2].value : "unknown";

                // Find or create an entry for facet1Value
                let entry = transformedData.find(e => e.name === facet1);
                if (!entry) {
                    entry = { name: facet1 };
                    transformedData.push(entry);
                }

                // Assign the data
                entry[facet2] = data[0].y;
            }
        });

        // Sort the transformed data by the 'name' property (alphabetically or by month/year/weekday)
        const sortedTransformedData = transformedData.sort((a, b) => this.sortByMonthAndYearOrWeekday(a.name, b.name));

        // Extract the keys for the facets across all transformed data
        const facetKeys = sortedTransformedData
            .flatMap(entry => Object.keys(entry))
            .filter(key => key !== 'name')
            .sort(this.sortByMonthAndYearOrWeekday);
        const uniqueFacetKeys = Array.from(new Set(facetKeys));
    
        // As we need to return the yAxisLabel too, let's fetch it here
        const yAxisLabel = rawData && rawData.length > 0 && rawData[0].metadata.groups[0].displayName
        ? rawData[0].metadata.groups[0].displayName
        : 'Y-Axis'; // Default label if none found

        return {
            data: sortedTransformedData,
            yAxisLabel, // Include this additional field to hold the Y-Axis Label
            uniqueFacetKeys
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
        
                            const { data: transformedData, yAxisLabel, uniqueFacetKeys } = this.transformData(data);
        
                            // Prepare data for Plotly
                            const plotlyData = uniqueFacetKeys.map(facet2 => ({
                                x: transformedData.map(entry => entry.name),
                                y: transformedData.map(entry => entry[facet2] || 0),
                                type: 'bar',
                                name: facet2,
                                hoverlabel: { namelength: -1 } // display full text without truncation
                            }));
                            
                            // Create the layout
                            const layout = {
                                barmode: 'group',
                                xaxis: {
                                    automargin: true ,
                                },
                                yaxis: {
                                    title: {
                                        text: yAxisLabel,
                                        font: {
                                            weight: 'bold'
                                        },
                                        standoff: 20 // Adjust this value to move the y-axis label further to the left
                                    },
                                    automargin: true
                                },
                                margin: {
                                    t: 0,
                                    b: 0,
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
                SELECT average(pageRenderingDuration) FROM PageView FACET userAgentName, countryCode SINCE 1 MONTH AGO
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
