# nr1-custom-visualizations
A custom visualization Nerdpack for New Relic containing charts not found in New Relic by default.

## Plotly
The following charts are made with Plotly.

### Grouped Bar Chart
This is a Grouped Bar Chart with two FACETs made with Plotly.
![Grouped Bar Chart](/visualizations/plotly-grouped-bar-chart/grouped-bar-chart.png)

#### Use Cases
Break down response times by browser and country.
```sql
SELECT average(duration)
FROM PageView
WHERE appName='my-web-app'
FACET userAgentName, countryCode
SINCE THIS MONTH LIMIT MAX
```
### HeatMap
This is a Heatmap with two FACETs made with Plotly.
![Heatmap](/visualizations/plotly-heatmap/heatmap.png)

#### Use Cases
Break down ingest by weekday and date.
```sql
SELECT sum(GigabytesIngested)
FROM NrConsumption
FACET dayOfMonthOf(timestamp), weekdayOf(timestamp)
SINCE THIS MONTH LIMIT MAX
```

### Sankey Diagram
This is a Sankey Diagram with two FACETs made with Plotly.
![Sankey Diagram](/visualizations/plotly-sankey-diagram/sankey-diagram.png)

#### Use Cases
See the flow of `BrowserInteraction` for all of your browser applications.
```sql
SELECT count(*)
FROM BrowserInteraction
FACET previousGroupedUrl, targetGroupedUrl
SINCE 24 HOURS AGO LIMIT MAX
```

### 100% Stacked Bar Chart
A variation on the stacked bar chart where each bar adds up to 100% using two FACETs.
![100% Stacked Bar Chart](/visualizations/plotly-100-stacked-bar-chart/100-stacked-bar-chart.png)

#### Use Cases
Looking at the adoption of newer mobile app versions over time
```sql
SELECT count(*)
FROM MobileSession
WHERE entity.name='my-mobile-app'
FACET weekOf(timestamp), appVersion
SINCE THIS MONTH LIMIT MAX
```

### Pareto Chart
Using a single FACET we can get a pareto chart.
![100% Stacked Bar Chart](/visualizations/plotly-pareto-chart/pareto-chart.png)

#### Use Cases
Check data ingest relative to usage type and see cumaltive percentage on the same chart.
```sql
SELECT sum(GigabytesIngested)
FROM NrConsumption
FACET usageMetric
SINCE THIS MONTH LIMIT MAX
```

### Cumulative Sum Chart
Using two FACETs, we can create a cumulative sum chart.
![Cumulative Sum Chart](/visualizations/plotly-cumulative-sum-chart/cumulative-sum-chart.png)

#### Use Cases
Get cumulative sum of sales data over time
```sql
SELECT sum(numeric(Value)) AS 'Cumulative Sum'
FROM lookup(salesData)
FACET Date, `Product Sold` 
```


### Vertical Bar Chart
Using a single FACET we can get a vertical bar chart with grid enabled.
![100% Stacked Bar Chart](/visualizations/plotly-vertical-bar-chart/vertical-bar-chart.png)

#### Use Cases
Analyze data with fixed time period with one FACET to get non-timeseries bar chart.
```sql
SELECT median(duration)
FROM PageView
FACET countryCode
SINCE THIS MONTH LIMIT MAX
```

### Horizontal Bar Chart
Using a single FACET we can get a horizontal bar chart with grid enabled.
![100% Stacked Bar Chart](/visualizations/plotly-horizontal-bar-chart/horizontal-bar-chart.png)

#### Use Cases
Analyze data with fixed time period with one FACET to get non-timeseries bar chart.
```sql
SELECT median(duration)
FROM PageView
FACET countryCode
SINCE THIS MONTH LIMIT MAX
```

## Recharts
The following charts are made with Recharts.

### Simple Bar Chart
Made with Recharts, this is a Grouped Bar Chart is used with two FACETs.
![Simple Bar Chart](/visualizations/recharts-simple-bar-chart/simple-bar-chart.png)


### Simple Bar Chart Timeseries
Made with Recharts, this is a Grouped Bar Chart that groups by timeseries bucket.
![Simple Bar Chart](/visualizations/recharts-simple-bar-chart-timeseries/simple-bar-chart-timeseries.png)


### Treemap
Made with Recharts, this Treemap is animated.
![Treemap Chart](/visualizations/recharts-radar-or-treemap/treemap-chart.png)

### Radar Chart
This is the default visualzation when you create a custom visualization:  
https://docs.newrelic.com/docs/new-relic-solutions/build-nr-ui/custom-visualizations/build-visualization/
![Radar Chart](/visualizations/recharts-radar-chart/radar-chart.png)

## Prerequisites

Run the following and make sure there are no errors.

```
git --version
npm -v
```

## Setup NR1 CLI
Get the New Relic One Command Line Interface (nr1-cli) here:

| OS      | Direct Link                                                |
| :------ | :--------------------------------------------------------- |
| Windows | https://cli.nr-ext.net/installer.exe                       |
| Linux   | `curl -s https://cli.nr-ext.net/installer.sh \| sudo bash` |
| Mac     | https://cli.nr-ext.net/installer.pkg                       |

Once `NR1 CLI` is installed, run the following to set up your profile
```
nr1 profiles:add --name <your-profile-name> --api-key NRAK-XXXXXXXXXXXXXXXXXXXXXXXXXXX --region us
```

If you get the following error:
```
 ›   Error: Please accept the New Relic Developer Terms and Conditions prior to executing this operation.
 ›   Code: TERMS_AND_CONDITIONS_NOT_ACCEPTED

```

Go to https://one.newrelic.com/developer-center and generate a new User API key. This should give you the option to review and accept the developer agreement to let you continue.

Check to make sure you are in the correct profile by using this command:
```
nr1 profiles:whoami
```

If you've installed nr1-cli in the past, you might have an old profile. Check it:
```
nr1 profiles:list
```

Otherwise, change your default profile to the account you need. It'll ask you to select the account with the up/down arrows on your keyboard to choose the default.
```
nr1 profiles:default
```

If you want to double-check everything is good:
```
cd ~/.newrelic
cat ./default-profile.json --> Check the profile name is correct
cat ./credentials.json --> Check the user API key and region is correct
```

If you've used nr1-cli before, delete everything in the `/certs` folder:
```
cd ~/.newrelic/certs
ls
rm -fr xxxx xxxx xxxx ...
```

## Install NerdPack

```
git clone https://github.com/pnvnd/nr1-custom-visualizations.git
cd nr1-custom-visualizations
npm install
nr1 nerdpack:uuid --generate --force
```

Keep note of the `uuid`, this will be important later when you want to remove this for good.

Now, check:
```
nr1 nerdpack:info
```
The “id” here is the `uuid` generated in the previous step and should match the id in the `nr1.json` file.

Finally, do this to test it locally:
```
nr1 nerdpack:serve
```

Paste in the link from the console and check out the Nerdpack.  Once everything is good:

```
nr1 nerdpack:publish
nr1 nerdpack:deploy
nr1 nerdpack:subscribe
```

## Update Nerdpack
When updates are available, you can update by simply navigating to the command-center-v2 repository and do this:
```
git pull
nr1 nerdpack:publish
```

Then, you can subscribe to the new version of the application from the New Relic user interface.

## Uninstall Nerdpack
To uninstall the Nerdpack completely, get the `uuid` for your application (usually from the `package.json` file). One example:
```
nr1 subscription:list
```
Then, in the New Relic user interface, unsubscribe from the application for ALL accounts.
```
nr1 subscription:unset --nerdpack-id=xxxxx
```

Finally, using your application’s `uuid``, un-deploy your application:
```
nr1 nerdpack:undeploy --nerdpack-id=xxxxx
```

You may have to log out and log back in to see the changes.
## Reference
https://docs.newrelic.com/docs/new-relic-solutions/build-nr-ui/nr1-cli/nr1-nerdpack/
https://docs.newrelic.com/docs/new-relic-solutions/build-nr-ui/nr1-cli/nr1-subscription/

